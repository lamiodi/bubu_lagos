import { query } from './db.js';
import bcrypt from 'bcrypt';
import { SAMPLE_CATEGORIES, SAMPLE_COLLECTIONS } from '../../bubu-lagos-web/src/lib/sampleProducts.js';
import { logger } from './utils/logger.js';

async function seed() {
    logger.info('Starting seed process for Categories + Collections architecture...');

    try {
        // 1. Create First Admin User
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@bubulagos.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Bubu2025';

        const existingAdmin = await query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);

        if (existingAdmin.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            await query(
                'INSERT INTO admin_users (email, password_hash, username) VALUES ($1, $2, $3)',
                [adminEmail, hashedPassword, 'Super Admin']
            );
            logger.info(`✅ Admin user created: ${adminEmail}`);
        } else {
            logger.info('ℹ️ Admin user already exists.');
        }

        // 2. Seed Categories (What products ARE)
        logger.info('Seeding categories...');
        for (const cat of SAMPLE_CATEGORIES) {
            await query(
                `INSERT INTO categories (name, slug, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description`,
                [cat.name, cat.slug, cat.description]
            );
        }

        // 3. Seed Collections (Merchandising groups)
        logger.info('Seeding collections...');
        for (const col of SAMPLE_COLLECTIONS) {
            await query(
                `INSERT INTO collections (name, slug, description, banner_url, accent_color, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, display_order = EXCLUDED.display_order`,
                [col.name, col.slug, col.description, col.bannerUrl, col.accentColor, col.displayOrder]
            );
        }

        logger.info('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
