import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- UPDATING BUBU SCHEMA TO 120,000 NAIRA ---');

  // 1. Update bubu.products
  const bubuProdRes = await client.query(`
    UPDATE bubu.products 
    SET base_price = 120000.00
    RETURNING id, name, base_price;
  `);
  console.log(`Updated ${bubuProdRes.rowCount} products in bubu.products.`);

  // 2. Update bubu.product_variants
  const bubuVarRes = await client.query(`
    UPDATE bubu.product_variants 
    SET price = 120000.00
    RETURNING id, name, price;
  `);
  console.log(`Updated ${bubuVarRes.rowCount} variants in bubu.product_variants.`);

  // 3. Update public.products if any exist
  try {
    const pubProdRes = await client.query(`
      UPDATE public.products 
      SET base_price = 120000.00
      RETURNING id, name, base_price;
    `);
    console.log(`Updated ${pubProdRes.rowCount} products in public.products.`);
  } catch (e) {
    console.log('No public.products updated or error:', e.message);
  }

  // 4. Update public.product_variants if any exist
  try {
    const pubVarRes = await client.query(`
      UPDATE public.product_variants 
      SET price = 120000.00
      RETURNING id, name, price;
    `);
    console.log(`Updated ${pubVarRes.rowCount} variants in public.product_variants.`);
  } catch (e) {
    console.log('No public.product_variants updated or error:', e.message);
  }

  // Verification check
  console.log('\n--- VERIFICATION: BUBU.PRODUCTS ---');
  const verifyProds = await client.query('SELECT id, name, base_price FROM bubu.products ORDER BY name ASC');
  verifyProds.rows.forEach(p => {
    console.log(`  ${p.name}: ₦${parseFloat(p.base_price).toLocaleString()}`);
  });

  console.log('\n--- VERIFICATION: BUBU.PRODUCT_VARIANTS ---');
  const verifyVars = await client.query('SELECT id, name, price FROM bubu.product_variants LIMIT 10');
  verifyVars.rows.forEach(v => {
    console.log(`  Variant ${v.name}: ₦${parseFloat(v.price).toLocaleString()}`);
  });

  await client.end();
}

run().catch(console.error);
