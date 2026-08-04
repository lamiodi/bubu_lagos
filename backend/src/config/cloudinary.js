import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const isVideo = file.mimetype.startsWith('video') || ['mp4', 'mov', 'webm', 'qt', 'm4v'].includes(ext);
    const sanitizedBase = (file.originalname.split('.')[0] || 'file')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    return {
      folder: 'bubu',
      resource_type: isVideo ? 'video' : 'image',
      format: isVideo ? 'mp4' : undefined,
      public_id: `${Date.now()}-${sanitizedBase}`,
    };
  },
});

const upload = multer({ storage: storage });

export { cloudinary, upload };
