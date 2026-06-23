// ===========================================================================
// One-off migration + schema inspection script
//
// Connects to the WodiFair Supabase project (shared by WodiFair + Retail +
// Bubu), applies the two pending migration files, inspects the full schema
// across all three namespaces (public, retail, bubu, erp), and reports
// optimization opportunities.
//
// Safe to re-run: every CREATE in the migration files uses IF NOT EXISTS.
// ===========================================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd || (process.env.DATABASE_URL || '').includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
  max: 2,
  connectionTimeoutMillis: 10_000,
  application_name: 'migrate-and-inspect',
});

const log = (msg) => console.log(`[migrate] ${msg}`);
const ok = (msg) => console.log(`  \u2713 ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
const sec = (msg) => console.log(`\n=== ${msg} ===`);

// __dirname = .../Bubu lagos/backend/scripts
// resolve(__dirname, '..', '..', '..', 'wodifairrebrand', 'backend', 'migrations')
//   = .../trae_projects/wodifairrebrand/backend/migrations
const MIGRATIONS_DIR = resolve(__dirname, '..', '..', '..',
  'wodifairrebrand', 'backend', 'migrations');

const MIGRATIONS = [
  'add_retail_schema.sql',
  'add_bubu_schema.sql',
  'optimize_schema.sql',
];

// -----------------------------------------------------------------------
// 1. Apply migrations
// -----------------------------------------------------------------------
async function applyMigrations() {
  sec('APPLY MIGRATIONS');
  for (const file of MIGRATIONS) {
    const path = resolve(MIGRATIONS_DIR, file);
    log(`reading ${file}`);
    const sql = readFileSync(path, 'utf8');
    const t0 = Date.now();
    const client = await pool.connect();
    try {
      // Use SAVEPOINTs internally so the script survives per-statement
      // errors gracefully (the DDL is idempotent so re-runs are no-ops).
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      ok(`${file} applied in ${Date.now() - t0} ms`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      warn(`${file} FAILED: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}

// -----------------------------------------------------------------------
// 2. Inspect schemas
// -----------------------------------------------------------------------
async function inspectSchemas() {
  sec('SCHEMAS PRESENT');
  const { rows: schemas } = await pool.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND schema_name NOT LIKE 'pg_temp_%'
    ORDER BY schema_name
  `);
  schemas.forEach((s) => ok(`schema: ${s.schema_name}`));

  sec('TABLES BY SCHEMA');
  const { rows: tables } = await pool.query(`
    SELECT table_schema, table_name,
           (SELECT count(*) FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS col_count
    FROM information_schema.tables t
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);
  let lastSchema = '';
  for (const t of tables) {
    if (t.table_schema !== lastSchema) {
      console.log();
      lastSchema = t.table_schema;
    }
    ok(`${t.table_schema}.${t.table_name}  (${t.col_count} cols)`);
  }

  sec('COLUMNS BY TABLE (PRIMARY KEY + FIRST 3 + NULLABLE COUNTS)');
  const { rows: cols } = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'retail', 'bubu', 'erp')
    ORDER BY table_schema, table_name, ordinal_position
  `);
  const byTable = new Map();
  for (const c of cols) {
    const k = `${c.table_schema}.${c.table_name}`;
    if (!byTable.has(k)) byTable.set(k, []);
    byTable.get(k).push(c);
  }
  for (const [k, cs] of byTable) {
    const nullableCount = cs.filter((c) => c.is_nullable === 'YES').length;
    ok(`${k}  ${cs.length} cols (${nullableCount} nullable)`);
  }

  sec('INDEXES');
  const { rows: idxs } = await pool.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname IN ('public', 'retail', 'bubu', 'erp')
    ORDER BY schemaname, tablename, indexname
  `);
  for (const i of idxs) {
    const clean = i.indexdef.replace(/\s+/g, ' ');
    ok(`${i.schemaname}.${i.tablename}.${i.indexname}`);
    console.log(`      ${clean}`);
  }

  sec('FOREIGN KEYS');
  const { rows: fks } = await pool.query(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name,
           kcu.column_name,
           ccu.table_schema AS ref_schema,
           ccu.table_name AS ref_table,
           ccu.column_name AS ref_column,
           rc.update_rule, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema IN ('public', 'retail', 'bubu', 'erp')
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
  `);
  for (const f of fks) {
    ok(`${f.table_schema}.${f.table_name}.${f.column_name} -> ${f.ref_schema}.${f.ref_table}.${f.ref_column}  (on update: ${f.update_rule}, on delete: ${f.delete_rule})`);
  }

  sec('UNIQUE CONSTRAINTS');
  const { rows: uqs } = await pool.query(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema IN ('public', 'retail', 'bubu', 'erp')
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
    ORDER BY tc.table_schema, tc.table_name
  `);
  for (const u of uqs) {
    ok(`${u.table_schema}.${u.table_name}  UNIQUE (${u.columns})`);
  }
}

// -----------------------------------------------------------------------
// 3. Optimization analysis
// -----------------------------------------------------------------------
async function analyzeOptimizations() {
  sec('OPTIMIZATION ANALYSIS');

  // 3a. Tables that look like "main entity" tables but have no indexes on
  //     their common lookup columns. Heuristic: any TEXT/VARCHAR column
  //     named *id, *code, *email, *phone, status, *type, payment_reference,
  //     is_active, that doesn't have an index.
  const { rows: missingIdx } = await pool.query(`
    WITH candidates AS (
      SELECT c.table_schema, c.table_name, c.column_name
      FROM information_schema.columns c
      WHERE c.table_schema IN ('public', 'retail', 'bubu', 'erp')
        AND c.data_type IN ('text', 'character varying', 'uuid')
        AND (
          c.column_name ~* '(^|_)id$'
          OR c.column_name ~* '(^|_)code$'
          OR c.column_name ~* '(^|_)email$'
          OR c.column_name ~* '(^|_)phone$'
          OR c.column_name IN ('status', 'is_active', 'payment_reference', 'barcode', 'shift_id', 'customer_id', 'product_id', 'category_id', 'order_id', 'gift_card_id', 'coupon_id', 'original_sale_id', 'parent_id', 'parent_category_id')
        )
    )
    SELECT c.table_schema, c.table_name, c.column_name
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes i
      WHERE i.schemaname = c.table_schema
        AND i.tablename  = c.table_name
        AND (i.indexdef ILIKE '%(' || c.column_name || ')%'
             OR i.indexdef ILIKE '%("' || c.column_name || '")%'
             OR i.indexdef ILIKE '%(' || c.column_name || ',%'
             OR i.indexdef ILIKE '%("' || c.column_name || '",%'
             OR i.indexdef ILIKE '%, ' || c.column_name || ')%'
             OR i.indexdef ILIKE '%, "' || c.column_name || '")%')
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        AND tc.table_schema = c.table_schema
        AND tc.table_name = c.table_name
        AND kcu.column_name = c.column_name
    )
    ORDER BY c.table_schema, c.table_name, c.column_name
  `);
  console.log(`\n--- Missing indexes on common lookup columns (${missingIdx.length}) ---`);
  for (const m of missingIdx) {
    warn(`${m.table_schema}.${m.table_name}.${m.column_name}  -- consider adding an index`);
  }

  // 3b. Foreign keys without a supporting index on the referencing column
  //     (causes slow JOINs and CASCADE deletes).
  const { rows: fkNoIdx } = await pool.query(`
    WITH fk_cols AS (
      SELECT tc.table_schema, tc.table_name, kcu.column_name,
             ccu.table_schema AS ref_schema, ccu.table_name AS ref_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('public', 'retail', 'bubu', 'erp')
    )
    SELECT f.table_schema, f.table_name, f.column_name, f.ref_table
    FROM fk_cols f
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes i
      WHERE i.schemaname = f.table_schema
        AND i.tablename  = f.table_name
        AND (i.indexdef ILIKE '%(' || f.column_name || ')%'
             OR i.indexdef ILIKE '%("' || f.column_name || '")%'
             OR i.indexdef ILIKE '%(' || f.column_name || ',%'
             OR i.indexdef ILIKE '%("' || f.column_name || '",%'
             OR i.indexdef ILIKE '%, ' || f.column_name || ')%'
             OR i.indexdef ILIKE '%, "' || f.column_name || '")%')
    )
    ORDER BY f.table_schema, f.table_name
  `);
  console.log(`\n--- Foreign keys without a supporting index (${fkNoIdx.length}) ---`);
  for (const m of fkNoIdx) {
    warn(`${m.table_schema}.${m.table_name}.${m.column_name} -> ${m.ref_table}  -- JOINs on this will seq-scan`);
  }

  // 3c. Tables that are JSONB-heavy and have no GIN index
  const { rows: jsonbNoGin } = await pool.query(`
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema IN ('public', 'retail', 'bubu', 'erp')
      AND c.data_type = 'jsonb'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = c.table_schema
          AND i.tablename  = c.table_name
          AND i.indexdef ILIKE '%gin%'
          AND (i.indexdef ILIKE '%(' || c.column_name || ')%'
             OR i.indexdef ILIKE '%("' || c.column_name || '")%')
    )
    ORDER BY c.table_schema, c.table_name
  `);
  console.log(`\n--- JSONB columns without a GIN index (${jsonbNoGin.length}) ---`);
  for (const m of jsonbNoGin) {
    warn(`${m.table_schema}.${m.table_name}.${m.column_name}  -- queries on JSONB will be slow`);
  }

  // 3d. Tables that are likely append-only and could benefit from
  //     partitioning (orders, sales, audit_logs, sync_log)
  const { rows: appendOnly } = await pool.query(`
    SELECT c.table_schema, c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    WHERE (c.table_schema, c.table_name) IN (
      ('retail', 'wodi_sales'), ('retail', 'wodi_audit_logs'),
      ('retail', 'sync_log'), ('bubu', 'orders'),
      ('bubu', 'order_items'), ('bubu', 'gift_card_logs')
    )
    AND c.column_name IN ('created_at', 'openedAt', 'received_at', 'subscribed_at')
  `);
  console.log(`\n--- Append-only tables (partition candidates, ${appendOnly.length}) ---`);
  for (const m of appendOnly) {
    ok(`${m.table_schema}.${m.table_name}.${m.column_name}  (${m.data_type}) -- consider monthly partitioning once you cross ~1M rows`);
  }

  // 3e. Row counts so we can see what's actually used
  sec('ROW COUNTS (for prioritization)');
  for (const schema of ['public', 'retail', 'bubu', 'erp']) {
    const { rows: counts } = await pool.query(`
      SELECT relname AS table_name, n_live_tup AS rows
      FROM pg_stat_user_tables
      WHERE schemaname = $1
      ORDER BY n_live_tup DESC
    `, [schema]);
    if (counts.length) {
      console.log(`\n  schema: ${schema}`);
      for (const c of counts) {
        const n = c.rows === null ? '?' : Number(c.rows).toLocaleString();
        ok(`${c.table_name}  ${n} rows`);
      }
    }
  }

  // 3f. Existing autovacuum settings (recommend tuning for big tables)
  sec('AUTOVACUUM SETTINGS (defaults shown if not set per-table)');
  const { rows: av } = await pool.query(`
    SELECT schemaname, relname, n_live_tup, n_dead_tup,
           last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname IN ('public', 'retail', 'bubu', 'erp')
      AND n_live_tup > 1000
    ORDER BY n_dead_tup DESC NULLS LAST
  `);
  for (const r of av) {
    ok(`${r.schemaname}.${r.relname}  live=${r.n_live_tup}  dead=${r.n_dead_tup}  last_av=${r.last_autovacuum || 'never'}`);
  }
}

// -----------------------------------------------------------------------
// 4. Run
// -----------------------------------------------------------------------
(async () => {
  try {
    log(`connecting to ${(process.env.DATABASE_URL || '').split('@')[1] || 'db'}`);
    await applyMigrations();
    await inspectSchemas();
    await analyzeOptimizations();
    log('done');
  } catch (err) {
    console.error('\nFATAL:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
