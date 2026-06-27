import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool, { setBubuSearchPath } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // -----------------------------------------------------------------------
    // Shared-schema fast path
    //
    // The WodiFair backend's migration `add_bubu_schema.sql` is the source
    // of truth for the Bubu table layout — it runs on every WodiFair
    // deploy, creates everything in the `bubu` schema, and is idempotent.
    //
    // If that schema already exists with the expected tables, we skip
    // the 001-017 local migrations entirely. They use unqualified names
    // (e.g. `CREATE TABLE categories`) which would otherwise target
    // whichever schema is first in `search_path` — and the WodiFair
    // schema has *different* type names (`bubu_order_status` vs
    // `order_status`), so running both side-by-side would break.
    //
    // Result: with the shared schema present, this is a no-op.
    // -----------------------------------------------------------------------
    await setBubuSearchPath(client);

    const { rows: [{ bubuSchemaExists }] } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'bubu'
      ) AS bubuSchemaExists
    `);

    if (bubuSchemaExists) {
      const { rows: tableRows } = await client.query(`
        SELECT count(*)::int AS n
        FROM information_schema.tables
        WHERE table_schema = 'bubu'
      `);
      const tableCount = tableRows[0]?.n ?? 0;
      console.log(
        `[bubu] Shared 'bubu' schema is present (${tableCount} tables). ` +
        `Local migrations 001-017 are managed by the WodiFair backend's ` +
        `'add_bubu_schema.sql' — skipping.`
      );
      await ensureAdminUser(client);
      return;
    }

    // ----- Fallback: no shared schema, run the local migrations. -----
    // This branch is hit only if the WodiFair migrations have never run
    // (e.g. dev environment that uses a dedicated Bubu DB). Do NOT use
    // this for production.

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');

    const executedResult = await client.query('SELECT migration_name FROM schema_migrations');
    const executedMigrations = new Set(executedResult.rows.map(r => r.migration_name));

    const migrationsDir = join(__dirname, '..', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        console.log(`Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`Running ${filename}...`);

      const migrationPath = join(migrationsDir, filename);
      const sql = readFileSync(migrationPath, 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Completed ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Migration completed successfully!');
    await ensureAdminUser(client);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// ---------------------------------------------------------------------------
// Ensure admin user exists with default credentials.
// Only creates the admin user if it doesn't exist — does NOT overwrite
// existing passwords to avoid locking out admins when env vars change.
// ---------------------------------------------------------------------------
async function ensureAdminUser(client) {
  const email    = process.env.ADMIN_EMAIL    || 'Wodibenuah@yahoo.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@Bubu2025';

  // Find which schema admin_users lives in
  const { rows: schemas } = await client.query(`
    SELECT table_schema FROM information_schema.tables
    WHERE table_name = 'admin_users'
      AND table_schema IN ('bubu', 'public')
    LIMIT 1
  `);

  if (schemas.length === 0) {
    console.warn('[bubu] admin_users table not found — skipping admin upsert.');
    return;
  }

  const schema = schemas[0].table_schema;

  // Check if admin user already exists (case-insensitive)
  const { rows: existing } = await client.query(
    `SELECT id FROM ${schema}.admin_users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (existing.length > 0) {
    console.log(`[bubu] ℹ️  Admin user already exists: ${email} (schema: ${schema}) — skipping creation`);
    return;
  }

  // Check which optional columns exist
  const colExists = async (col) => {
    const r = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'admin_users' AND column_name = $2`,
      [schema, col]
    );
    return r.rows.length > 0;
  };

  const hasUsername = await colExists('username');
  const hasIsActive = await colExists('is_active');

  const passwordHash = await bcrypt.hash(password, 10);

  if (hasUsername && hasIsActive) {
    await client.query(
      `INSERT INTO ${schema}.admin_users (email, password_hash, username, is_active)
       VALUES ($1, $2, 'Super Admin', true)`,
      [email, passwordHash]
    );
  } else if (hasUsername) {
    await client.query(
      `INSERT INTO ${schema}.admin_users (email, password_hash, username)
       VALUES ($1, $2, 'Super Admin')`,
      [email, passwordHash]
    );
  } else {
    await client.query(
      `INSERT INTO ${schema}.admin_users (email, password_hash)
       VALUES ($1, $2)`,
      [email, passwordHash]
    );
  }

  console.log(`[bubu] ✅ Admin user created: ${email} (schema: ${schema})`);
}

runMigrations();
