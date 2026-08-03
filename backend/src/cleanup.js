import { query } from './db.js';
import { logger } from './utils/logger.js';

async function cleanup() {
  logger.info('Cleaning up old categories and collections...');
  try {
    // Unlink old collections from products
    await query(`
      DELETE FROM product_collections 
      WHERE collection_id IN (
        SELECT id FROM collections 
        WHERE name NOT IN ('New Arrivals', 'Signature Bubu', 'Hand-Beaded Collection', 'Best Sellers')
      )
    `);

    // Delete old collections
    await query(`
      DELETE FROM collections 
      WHERE name NOT IN ('New Arrivals', 'Signature Bubu', 'Hand-Beaded Collection', 'Best Sellers')
    `);

    const bubuCat = await query("SELECT id FROM categories WHERE name = 'Bubus' LIMIT 1");
    if (bubuCat.rows.length > 0) {
      const bubuId = bubuCat.rows[0].id;
      // Re-link old categories to Bubus
      await query(`
        UPDATE products
        SET category_id = $1
        WHERE category_id IN (
          SELECT id FROM categories 
          WHERE name NOT IN ('Bubus', 'Turbans & Gelès', 'Artisan Accessories')
        )
      `, [bubuId]);
    } else {
      // Create Bubus temporarily if it doesn't exist so we can link
      const newCat = await query("INSERT INTO categories (name, slug, description) VALUES ('Bubus', 'bubus', 'Temp') RETURNING id");
      await query(`
        UPDATE products
        SET category_id = $1
        WHERE category_id IN (
          SELECT id FROM categories 
          WHERE name NOT IN ('Bubus', 'Turbans & Gelès', 'Artisan Accessories')
        )
      `, [newCat.rows[0].id]);
    }

    // Delete old categories
    await query(`
      DELETE FROM categories 
      WHERE name NOT IN ('Bubus', 'Turbans & Gelès', 'Artisan Accessories')
    `);

    logger.info('✅ Cleanup complete!');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanup();
