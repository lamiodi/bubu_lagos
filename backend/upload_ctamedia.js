import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: 'dwmz4youk',
  api_key: '668429968817415',
  api_secret: '-g0Cevf6a2n6zePb-QB3569y2XE',
  secure: true,
});

const mediaDir = 'c:\\Users\\nuke\\Documents\\trae_projects\\Bubu lagos\\bubu-lagos-web\\public\\ctamedia';

async function uploadAll() {
  const files = fs.readdirSync(mediaDir);
  console.log(`Found ${files.length} files to upload...`);

  const results = {};

  for (const file of files) {
    const filePath = path.join(mediaDir, file);
    const isVideo = file.toLowerCase().endsWith('.mp4');
    console.log(`Uploading ${file} (${isVideo ? 'video' : 'image'})...`);

    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'bubu_cta',
        resource_type: isVideo ? 'video' : 'image',
        use_filename: true,
        unique_filename: false,
        overwrite: true
      });
      console.log(`✅ Uploaded ${file} -> ${res.secure_url}`);
      results[file] = res.secure_url;
    } catch (err) {
      console.error(`❌ Error uploading ${file}:`, err);
    }
  }

  console.log('\n--- UPLOAD SUMMARY JSON ---');
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync('./cloudinary_ctamedia_map.json', JSON.stringify(results, null, 2));
}

uploadAll();
