import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
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
const tempDir = path.resolve(__dirname, '../temp_4k_processed');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Enhances image to 4K resolution (max dimension 3840px)
 * using Lanczos3 interpolation and subtle unsharp masking for fabric texture,
 * while preserving the original background 100%.
 */
async function enhanceAndUpscaleTo4K(inputBuffer, outputFilename) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const isPortrait = metadata.height >= metadata.width;
  let targetWidth, targetHeight;

  if (isPortrait) {
    targetHeight = 3840;
    targetWidth = Math.round((3840 / metadata.height) * metadata.width);
  } else {
    targetWidth = 3840;
    targetHeight = Math.round((3840 / metadata.width) * metadata.height);
  }

  console.log(`  Processing ${outputFilename}: ${metadata.width}x${metadata.height} -> 4K (${targetWidth}x${targetHeight})`);

  const outputPath = path.join(tempDir, outputFilename);

  await sharp(inputBuffer)
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .sharpen({
      sigma: 1.1,
      m1: 0.8,
      m2: 2.2,
    })
    .toColorspace('srgb')
    .jpeg({
      quality: 95,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toFile(outputPath);

  return outputPath;
}

async function uploadToCloudinary(filePath, publicIdSuffix = '') {
  const fileName = path.basename(filePath);
  console.log(`  Uploading 4K asset ${fileName} to Cloudinary...`);
  const res = await cloudinary.uploader.upload(filePath, {
    folder: 'bubu',
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    overwrite: true,
  });
  console.log(`  ✅ Uploaded 4K -> ${res.secure_url} (${res.width}x${res.height})`);
  return res.secure_url;
}

async function downloadUrlToBuffer(url) {
  console.log(`  Downloading remote image: ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function main() {
  console.log('====================================================');
  console.log('🚀 4K Image Enhancement & Upload Pipeline Starting');
  console.log('====================================================\n');

  // 1. Process The EGO Dress I (Brown)
  console.log('--- [1/4] Processing The EGO Dress I (Brown) ---');
  const brownDir = path.join(baseDir, 'brownimage');
  const brownFiles = fs.readdirSync(brownDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const brown4kUrls = [];
  for (const f of brownFiles) {
    const inputBuf = fs.readFileSync(path.join(brownDir, f));
    const processedPath = await enhanceAndUpscaleTo4K(inputBuf, `4k_ego_brown_${path.parse(f).name}.jpg`);
    const url = await uploadToCloudinary(processedPath);
    brown4kUrls.push(url);
  }

  // 2. Process The EGO Dress II (Green)
  console.log('\n--- [2/4] Processing The EGO Dress II (Green) ---');
  const greenDir = path.join(baseDir, 'greenimage');
  const greenFiles = fs.readdirSync(greenDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const green4kUrls = [];
  for (const f of greenFiles) {
    const inputBuf = fs.readFileSync(path.join(greenDir, f));
    const processedPath = await enhanceAndUpscaleTo4K(inputBuf, `4k_ego_green_${path.parse(f).name}.jpg`);
    const url = await uploadToCloudinary(processedPath);
    green4kUrls.push(url);
  }

  // 3. Process The EGO Dress III (Purple)
  console.log('\n--- [3/4] Processing The EGO Dress III (Purple) ---');
  const purpleDir = path.join(baseDir, 'purpleimage');
  const purpleFiles = fs.readdirSync(purpleDir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  const purple4kUrls = [];
  for (const f of purpleFiles) {
    const inputBuf = fs.readFileSync(path.join(purpleDir, f));
    const processedPath = await enhanceAndUpscaleTo4K(inputBuf, `4k_ego_purple_${path.parse(f).name}.jpg`);
    const url = await uploadToCloudinary(processedPath);
    purple4kUrls.push(url);
  }

  // 4. Process The AMEERAH Dress II (Ameerah 2 II)
  console.log('\n--- [4/4] Processing The AMEERAH Dress II (Ameerah 2 II) ---');
  const ameerah2SourceUrls = [
    'https://res.cloudinary.com/dwmz4youk/image/upload/v1785875284/bubu/1785875284038-IMG_8152.jpg',
    'https://res.cloudinary.com/dwmz4youk/image/upload/v1785875284/bubu/1785875284319-IMG_8155.jpg',
    'https://res.cloudinary.com/dwmz4youk/image/upload/v1785875285/bubu/1785875284571-IMG_8153.jpg',
    'https://res.cloudinary.com/dwmz4youk/image/upload/v1785875285/bubu/1785875284857-IMG_8154.jpg'
  ];
  const ameerah2_4kUrls = [];
  for (let i = 0; i < ameerah2SourceUrls.length; i++) {
    const inputBuf = await downloadUrlToBuffer(ameerah2SourceUrls[i]);
    const processedPath = await enhanceAndUpscaleTo4K(inputBuf, `4k_ameerah_2_img_${i + 1}.jpg`);
    const url = await uploadToCloudinary(processedPath);
    ameerah2_4kUrls.push(url);
  }

  console.log('\n=== Uploaded 4K URLs Summary ===');
  console.log('The EGO Dress I (Brown):', brown4kUrls);
  console.log('The EGO Dress II (Green):', green4kUrls);
  console.log('The EGO Dress III (Purple):', purple4kUrls);
  console.log('The AMEERAH Dress II:', ameerah2_4kUrls);

  // 5. Database Updates
  console.log('\n=== Step 5: Synchronizing Supabase Database ===');
  const client = await getClient();

  const egoDescription = `The EGO Dress\n\nEffortless Majesty, Contemporary Fluidity.\n\nDesigned with a voluminous, floor-sweeping silhouette crafted from premium rich textured silk. The Ego Dress offers a universal 'One Size Fits All' cut that gracefully drapes UK/US sizes 8 through 20. Featuring wide draped sleeves, an elegant neckline, and exceptional movement tailored for festive celebrations, luxury soirées, and upscale gatherings.\n\nProduct Details:\n* Luxurious premium fluid silk drape\n* Relaxed, flowing silhouette with graceful movement\n* Universal One Size Fits All (Comfortably fits UK/US 8 - 20)\n* Perfect for celebrations, soirées, and destination luxury\n\nStyling Tip:\nPair with our handcrafted silk velvet crown turbans and statement gold jewelry for an iconic Bubu Lagos look.`;

  const ameerahDescription = `The AMEERAH Dress II\n\nAn elevated reimagining of a classic, designed for those who command the room. Crafted from premium, breathable fabrics with meticulous attention to drape and movement.\n\nProduct Details:\n* Artisanal Lagos Tailoring\n* Signature Bubu fluid drape\n* Universal One Size Fits All (Comfortably fits UK/US 8 - 20)\n* Hand-finished luxury hem and detailing\n\nStyling Tip:\nPair with an artisanal silk turban and metallic heels for effortless glamour.`;

  const updates = [
    {
      id: '921ca500-6324-46ab-bb5f-9204801cc337',
      name: 'The EGO Dress I',
      images: brown4kUrls,
      description: egoDescription,
      price: 120000.00,
    },
    {
      name: 'The EGO Dress II',
      images: green4kUrls,
      description: egoDescription,
      price: 120000.00,
    },
    {
      name: 'The EGO Dress III',
      images: purple4kUrls,
      description: egoDescription,
      price: 120000.00,
    },
    {
      id: '25a31395-7fde-4fc3-9c73-72a908ba4fd2',
      name: 'The AMEERAH Dress II',
      images: ameerah2_4kUrls,
      description: ameerahDescription,
      price: 120000.00,
    }
  ];

  try {
    await client.query('BEGIN');

    for (const item of updates) {
      let targetId = item.id;
      if (!targetId) {
        const check = await client.query('SELECT id FROM products WHERE name = $1', [item.name]);
        if (check.rows.length > 0) {
          targetId = check.rows[0].id;
        }
      }

      if (targetId) {
        console.log(`Updating database for "${item.name}" (ID: ${targetId})...`);
        await client.query(
          `UPDATE products 
           SET images = $1, description = $2, base_price = $3 
           WHERE id = $4`,
          [item.images, item.description, item.price, targetId]
        );

        // Ensure variant exists with 'One Size (Fits 8 - 20)'
        await client.query(
          `DELETE FROM product_variants WHERE product_id = $1`,
          [targetId]
        );
        await client.query(
          `INSERT INTO product_variants (product_id, name, price, stock_quantity)
           VALUES ($1, $2, $3, $4)`,
          [targetId, 'One Size (Fits 8 - 20)', item.price, 25]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database transaction committed successfully!');

    // 6. Update products.json
    console.log('\n=== Step 6: Updating backend/products.json ===');
    const productsJsonPath = path.resolve(__dirname, '../products.json');
    if (fs.existsSync(productsJsonPath)) {
      const products = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));

      for (const p of products) {
        if (p.name === 'The EGO Dress I') {
          p.images = brown4kUrls;
          p.description = egoDescription;
        } else if (p.name === 'The EGO Dress II') {
          p.images = green4kUrls;
          p.description = egoDescription;
        } else if (p.name === 'The EGO Dress III') {
          p.images = purple4kUrls;
          p.description = egoDescription;
        } else if (p.name === 'The AMEERAH Dress II' || p.id === '25a31395-7fde-4fc3-9c73-72a908ba4fd2') {
          p.images = ameerah2_4kUrls;
          p.description = ameerahDescription;
        }
      }

      fs.writeFileSync(productsJsonPath, JSON.stringify(products, null, 2), 'utf8');
      console.log('✅ Updated backend/products.json');
    }

    // Clean up temporary processed directory
    console.log('\n🧹 Cleaning up temporary local files...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ Cleaned up temporary files.');

    console.log('\n🎉 ALL 4K PROCESSING, UPLOADING, AND DATABASE SYNCHRONIZATION COMPLETE!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database transaction:', err);
    throw err;
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
