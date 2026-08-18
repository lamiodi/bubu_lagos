import pool, { query } from '../src/db.js';

async function main() {
  const res = await query(`
    SELECT table_schema, table_name, column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('orders', 'order_items')
    ORDER BY table_name, ordinal_position
  `);
  console.table(res.rows);
  await pool.end();
}

main();
