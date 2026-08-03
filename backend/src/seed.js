import { query } from './db.js';
import bcrypt from 'bcrypt';
import { SAMPLE_PRODUCTS, SAMPLE_CATEGORIES, SAMPLE_COLLECTIONS } from '../../bubu-lagos-web/src/lib/sampleProducts.js';
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

        // 4. Seed Products and Product-Collection Mappings
        logger.info('Seeding products and collection mappings...');

        for (const p of SAMPLE_PRODUCTS) {
            const categoryName = p.category?.name || p.category;
            const catResult = await query('SELECT id FROM categories WHERE name = $1', [categoryName]);
            if (catResult.rows.length === 0) continue;
            const categoryId = catResult.rows[0].id;

            const productResult = await query(
                `INSERT INTO products (name, description, base_price, images, category_id)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [p.name, p.description, p.basePrice, p.images || [], categoryId]
            );

            let productId;
            if (productResult.rows.length > 0) {
                productId = productResult.rows[0].id;
            } else {
                const existingProd = await query('SELECT id FROM products WHERE name = $1', [p.name]);
                if (existingProd.rows.length > 0) productId = existingProd.rows[0].id;
            }

            if (productId) {
                // Link variants
                if (p.variants && p.variants.length > 0) {
                    for (const variant of p.variants) {
                        await query(
                            'INSERT INTO product_variants (product_id, name, price, stock_quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                            [productId, variant.name, variant.price, variant.stockQuantity || 50]
                        );
                    }
                }

                // Link Collections
                if (p.collections && Array.isArray(p.collections)) {
                    for (const col of p.collections) {
                        const colResult = await query('SELECT id FROM collections WHERE name = $1', [col.name]);
                        if (colResult.rows.length > 0) {
                            await query(
                                `INSERT INTO product_collections (product_id, collection_id)
                                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [productId, colResult.rows[0].id]
                            );
                        }
                    }
                }
            }
        }

        logger.info('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
