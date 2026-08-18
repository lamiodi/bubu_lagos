import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const migrationPath = path.resolve(__dirname, '../migrations/022_add_order_status_values.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 022_add_order_status_values.sql...');
    await query(sql);
    console.log('✅ Migration applied successfully!');

    const res = await query(`
      SELECT n.nspname as schema_name, t.typname as type_name, e.enumlabel 
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname LIKE '%order%'
    `);
    console.log('\nUpdated order status enums in database:');
    console.table(res.rows);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
