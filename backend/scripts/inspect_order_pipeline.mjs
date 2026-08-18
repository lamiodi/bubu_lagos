import pool, { query } from '../src/db.js';

async function main() {
  try {
    const enumRes = await query(`
      SELECT n.nspname as schema_name, t.typname as type_name, e.enumlabel 
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname LIKE '%order%'
    `);
    console.log('--- ORDER STATUS ENUMS ---');
    console.table(enumRes.rows);

    const colsRes = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    console.log('\n--- ORDERS TABLE COLUMNS ---');
    console.table(colsRes.rows);

    const itemCols = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      ORDER BY ordinal_position
    `);
    console.log('\n--- ORDER ITEMS TABLE COLUMNS ---');
    console.table(itemCols.rows);

    const ordersSample = await query(`
      SELECT id, reference, status, customer_name, customer_email, total_amount, tracking_number, shipping_carrier
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n--- RECENT ORDERS SAMPLE ---');
    console.table(ordersSample.rows);
  } catch (err) {
    console.error('Error inspecting:', err);
  } finally {
    await pool.end();
  }
}

main();
