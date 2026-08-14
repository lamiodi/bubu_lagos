import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, getClient } from '../src/db.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwmz4youk',
  api_key: process.env.CLOUDINARY_API_KEY || '668429968817415',
  api_secret: process.env.CLOUDINARY_API_SECRET || '-g0Cevf6a2n6zePb-QB3569y2XE',
  secure: true,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '../../bubu-lagos-web/public/product');

async function uploadFile(filePath, isVideo = false) {
  const fileName = path.basename(filePath);
  console.log(`Uploading ${fileName} (${isVideo ? 'video' : 'image'})...`);
  const res = await cloudinary.uploader.upload(filePath, {
    folder: 'bubu',
    resource_type: isVideo ? 'video' : 'image',
    format: isVideo ? 'mp4' : undefined,
    use_filename: true,
    unique_filename: true,
    overwrite: true,
  });
  console.log(`✅ Uploaded ${fileName} -> ${res.secure_url}`);
  return res.secure_url;
}

async function main() {
  console.log('=== Step 1: Uploading Media Assets to Cloudinary ===');

  const videoPath = path.join(baseDir, 'inmark.mov');
  let videoUrl = null;
  if (fs.existsSync(videoPath)) {
    videoUrl = await uploadFile(videoPath, true);
  } else {
    console.warn(`Video file not found at ${videoPath}`);
  }

  // Brown Images
  const brownDir = path.join(baseDir, 'brownimage');
  const brownFiles = fs.readdirSync(brownDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const brownUrls = [];
  for (const f of brownFiles) {
    const url = await uploadFile(path.join(brownDir, f));
    brownUrls.push(url);
  }

  // Green Images
  const greenDir = path.join(baseDir, 'greenimage');
  const greenFiles = fs.readdirSync(greenDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const greenUrls = [];
  for (const f of greenFiles) {
    const url = await uploadFile(path.join(greenDir, f));
    greenUrls.push(url);
  }

  // Purple Images
  const purpleDir = path.join(baseDir, 'purpleimage');
  const purpleFiles = fs.readdirSync(purpleDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const purpleUrls = [];
  for (const f of purpleFiles) {
    const url = await uploadFile(path.join(purpleDir, f));
    purpleUrls.push(url);
  }

  console.log('\n--- Upload Summary ---');
  console.log('Video URL:', videoUrl);
  console.log('Brown URLs:', brownUrls);
  console.log('Green URLs:', greenUrls);
  console.log('Purple URLs:', purpleUrls);

  console.log('\n=== Step 2: Database Integration ===');

  const categoryId = '49266ea1-c357-4257-a873-6aacbd123e1a'; // Bubus
  const collectionIds = [
    'a0dae3ea-1f45-4116-96ee-5c4526e6b9c6', // New Arrivals
    '3d9e8739-b10f-48d5-98a6-05d5f1052b80'  // Signature Bubu
  ];

  const baseDescription = `The EGO Dress\n\nEffortless Majesty, Contemporary Fluidity.\n\nDesigned with a voluminous, floor-sweeping silhouette crafted from premium rich textured silk. The Ego Dress offers a universal 'One Size Fits All' cut that gracefully drapes UK/US sizes 8 through 20. Featuring wide draped sleeves, an elegant neckline, and exceptional movement tailored for festive celebrations, luxury soirées, and upscale gatherings.\n\nProduct Details:\n* Luxurious premium fluid silk drape\n* Relaxed, flowing silhouette with graceful movement\n* Universal One Size Fits All (Comfortably fits UK/US 8 - 20)\n* Perfect for celebrations, soirées, and destination luxury\n\nStyling Tip:\nPair with our handcrafted silk velvet crown turbans and statement gold jewelry for an iconic Bubu Lagos look.`;

  const productsData = [
    {
      id: '921ca500-6324-46ab-bb5f-9204801cc337', // Existing EGO dress ID
      name: 'The EGO Dress I',
      colorName: 'Rich Mocha Brown',
      basePrice: 120000.00,
      images: brownUrls,
      videoUrl: videoUrl,
      colorPalette: ['#4A2C2A', '#CD7F32'],
      isUpdate: true
    },
    {
      name: 'The EGO Dress II',
      colorName: 'Emerald Green',
      basePrice: 120000.00,
      images: greenUrls,
      videoUrl: videoUrl,
      colorPalette: ['#0F3D2E', '#556B2F'],
      isUpdate: false
    },
    {
      name: 'The EGO Dress III',
      colorName: 'Regal Purple',
      basePrice: 120000.00,
      images: purpleUrls,
      videoUrl: videoUrl,
      colorPalette: ['#4B0082', '#58111A'],
      isUpdate: false
    }
  ];

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const createdIds = [];

    for (const p of productsData) {
      let prodId = p.id;

      if (p.isUpdate) {
        console.log(`Updating existing product ${p.id} -> "${p.name}"`);
        await client.query(
          `UPDATE products 
           SET name = $1, description = $2, base_price = $3, images = $4, video_url = $5, category_id = $6, color_palette = $7
           WHERE id = $8`,
          [p.name, baseDescription, p.basePrice, p.images, p.videoUrl, categoryId, p.colorPalette, p.id]
        );

        // Update variant
        await client.query(
          `DELETE FROM product_variants WHERE product_id = $1`,
          [p.id]
        );
        await client.query(
          `INSERT INTO product_variants (product_id, name, price, stock_quantity)
           VALUES ($1, $2, $3, $4)`,
          [p.id, 'One Size (Fits 8 - 20)', p.basePrice, 25]
        );

        // Update collections
        for (const colId of collectionIds) {
          await client.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [p.id, colId]
          );
        }

        createdIds.push(p.id);
      } else {
        // Check if product with this name already exists
        const checkRes = await client.query('SELECT id FROM products WHERE name = $1', [p.name]);
        if (checkRes.rows.length > 0) {
          prodId = checkRes.rows[0].id;
          console.log(`Product "${p.name}" already exists (${prodId}), updating...`);
          await client.query(
            `UPDATE products 
             SET description = $1, base_price = $2, images = $3, video_url = $4, category_id = $5, color_palette = $6
             WHERE id = $7`,
            [baseDescription, p.basePrice, p.images, p.videoUrl, categoryId, p.colorPalette, prodId]
          );
          await client.query(
            `DELETE FROM product_variants WHERE product_id = $1`,
            [prodId]
          );
          await client.query(
            `INSERT INTO product_variants (product_id, name, price, stock_quantity)
             VALUES ($1, $2, $3, $4)`,
            [prodId, 'One Size (Fits 8 - 20)', p.basePrice, 25]
          );
        } else {
          console.log(`Inserting new product -> "${p.name}"`);
          const insertRes = await client.query(
            `INSERT INTO products (name, description, base_price, images, video_url, category_id, color_palette)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [p.name, baseDescription, p.basePrice, p.images, p.videoUrl, categoryId, p.colorPalette]
          );
          prodId = insertRes.rows[0].id;

          await client.query(
            `INSERT INTO product_variants (product_id, name, price, stock_quantity)
             VALUES ($1, $2, $3, $4)`,
            [prodId, 'One Size (Fits 8 - 20)', p.basePrice, 25]
          );
        }

        // Add collections
        for (const colId of collectionIds) {
          await client.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [prodId, colId]
          );
        }

        createdIds.push(prodId);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database transaction committed successfully!');

    // Fetch and display final products
    const finalRes = await client.query(
      `SELECT p.id, p.name, p.base_price, p.images, p.video_url, p.color_palette,
              json_agg(pv.*) as variants
       FROM products p
       LEFT JOIN product_variants pv ON p.id = pv.product_id
       WHERE p.name ILIKE '%Ego Dress%'
       GROUP BY p.id`
    );

    console.log('\n=== Integrated Products in Database ===');
    console.log(JSON.stringify(finalRes.rows, null, 2));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database error:', err);
    throw err;
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
