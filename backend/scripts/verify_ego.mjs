import { query } from '../src/db.js';

async function verify() {
  const res = await query(`
    SELECT 
      p.id,
      p.name,
      p.base_price,
      p.images,
      p.video_url,
      p.color_palette,
      c.name as category_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pv.id,
            'name', pv.name,
            'price', pv.price,
            'stockQuantity', pv.stock_quantity
          )
        ) FILTER (WHERE pv.id IS NOT NULL), '[]'
      ) as variants,
      COALESCE(
        (
          SELECT json_agg(col.name)
          FROM product_collections pc
          JOIN collections col ON pc.collection_id = col.id
          WHERE pc.product_id = p.id
        ), '[]'
      ) as collections
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    WHERE p.name ILIKE '%Ego Dress%'
    GROUP BY p.id, c.name
    ORDER BY p.name ASC
  `);

  console.log('--- VERIFICATION RESULT ---');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

verify().catch(console.error);
