const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'products.json');
const content = fs.readFileSync(filePath, 'utf8');

const ctaImages = [
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883048/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.09_PM.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883049/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_1.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883051/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_2.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883052/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_3.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883053/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_4.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883054/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_5.jpg',
  'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883055/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM.jpg'
];

let imgIdx = 0;
const newContent = content.replace(/https:\/\/images\.unsplash\.com\/[^\"]+/g, () => {
  const replacement = ctaImages[imgIdx % ctaImages.length];
  imgIdx++;
  return replacement;
});

fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Replaced ${imgIdx} Unsplash URLs with Cloudinary CTA media links in products.json.`);
