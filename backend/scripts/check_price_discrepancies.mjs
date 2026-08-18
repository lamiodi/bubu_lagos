import pool, { query } from '../src/db.js';

async function main() {
  try {
    const prods = await query(`
      SELECT 
        p.id, 
        p.name, 
        p.base_price, 
        json_agg(
          json_build_object(
            'id', pv.id, 
            'name', pv.name, 
            'price', pv.price, 
            'stock', pv.stock_quantity
          ) ORDER BY pv.created_at
        ) FILTER (WHERE pv.id IS NOT NULL) as variants
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      GROUP BY p.id
      ORDER BY p.name
    `);

    console.log('=== PRODUCT & VARIANT PRICES IN DATABASE ===\n');
    let discrepancies = 0;
    let missingVariants = 0;

    for (const row of prods.rows) {
      const basePrice = parseFloat(row.base_price);
      console.log(`Product: "${row.name}" [ID: ${row.id}]`);
      console.log(`  Base Price: ₦${basePrice.toLocaleString()} (${row.base_price})`);

      if (!row.variants || row.variants.length === 0) {
        console.log('  ⚠️  NO VARIANTS / SIZES FOUND');
        missingVariants++;
      } else {
        for (const v of row.variants) {
          const varPrice = parseFloat(v.price);
          const isDiff = Math.abs(varPrice - basePrice) > 0.001;
          if (isDiff) {
            discrepancies++;
            console.log(`  ❌ Variant/Size "${v.name}": ₦${varPrice.toLocaleString()} (${v.price}) -> [MISMATCH with base price ₦${basePrice.toLocaleString()}]`);
          } else {
            console.log(`  ✅ Variant/Size "${v.name}": ₦${varPrice.toLocaleString()} (Matches Base Price)`);
          }
        }
      }
      console.log('');
    }

    console.log(`\n================ SUMMARY ================`);
    console.log(`Total Products: ${prods.rows.length}`);
    console.log(`Total Price Mismatches Between Base & Size/Variant: ${discrepancies}`);
    console.log(`Products with No Variants: ${missingVariants}`);
  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await pool.end();
  }
}

main();
