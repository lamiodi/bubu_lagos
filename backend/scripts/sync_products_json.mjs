import { query } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncProductsJson() {
  const res = await query(`
    SELECT id, name, description, images
    FROM products
    ORDER BY name ASC
  `);
  
  const targetPath = path.resolve(__dirname, '../products.json');
  fs.writeFileSync(targetPath, JSON.stringify(res.rows, null, 2));
  console.log(`Synced ${res.rows.length} products to products.json`);
  process.exit(0);
}

syncProductsJson().catch(err => {
  console.error(err);
  process.exit(1);
});
