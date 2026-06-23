import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
