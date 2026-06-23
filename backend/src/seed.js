import { query } from './db.js';
import bcrypt from 'bcrypt';
import { SAMPLE_PRODUCTS } from '../../bubu-lagos-web/src/lib/sampleProducts.js';
import { logger } from './utils/logger.js';

async function seed() {
    logger.info('Starting seed process...');

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
            logger.info(`🔑 Temporary Password: ${adminPassword}`);
        } else {
            logger.info('ℹ️ Admin user already exists.');
        }

        // 2. Seed Products from frontend library
        logger.info('Seeding products from frontend data...');

        for (const p of SAMPLE_PRODUCTS) {
            // Skip gift card product as it's handled separately
            if (p.isGiftCard) continue;
            
            // Get category name from the category object
            const categoryName = p.category?.name || p.category;
            
            // Find category ID
            const catResult = await query('SELECT id FROM categories WHERE name = $1', [categoryName]);
            if (catResult.rows.length === 0) {
                logger.info(`⚠️ Category not found for product ${p.name}: ${categoryName}`);
                continue;
            }
            const categoryId = catResult.rows[0].id;

            // Insert product
            const productResult = await query(
                `INSERT INTO products (name, description, base_price, images, category_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
                [p.name, p.description || `${p.name} from the ${p.collection || 'Atelier'} collection.`, p.basePrice, p.images || [], categoryId]
            );

            if (productResult.rows.length > 0) {
                const productId = productResult.rows[0].id;
                // Insert variants if they exist
                if (p.variants && p.variants.length > 0) {
                    for (const variant of p.variants) {
                        await query(
                            'INSERT INTO product_variants (product_id, name, price, stock_quantity) VALUES ($1, $2, $3, $4)',
                            [productId, variant.name, variant.price, variant.stockQuantity || 50]
                        );
                    }
                } else {
                    // Add a default variant (One Size)
                    await query(
                        'INSERT INTO product_variants (product_id, name, price, stock_quantity) VALUES ($1, $2, $3, $4)',
                        [productId, 'Universal', p.basePrice, 50]
                    );
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
