import { query } from '../db.js';

/**
 * Validates a coupon code
 */
export const validateCoupon = async (req, res) => {
    const { code, cartTotal } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Coupon code is required' });
    }

    try {
        const result = await query(
            `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid coupon code' });
        }

        const coupon = result.rows[0];

        // Check expiry
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        // Check minimum order amount
        if (cartTotal && parseFloat(cartTotal) < parseFloat(coupon.min_order_amount)) {
            return res.status(400).json({ 
                error: `Minimum order amount for this coupon is ₦${parseFloat(coupon.min_order_amount).toLocaleString()}` 
            });
        }

        let discountAmount = 0;
        if (coupon.type === 'Percentage') {
            discountAmount = (parseFloat(cartTotal) * parseFloat(coupon.value)) / 100;
            if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
            }
        } else if (coupon.type === 'Fixed') {
            discountAmount = parseFloat(coupon.value);
        }

        res.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: parseFloat(coupon.value),
                discountAmount: Math.min(discountAmount, parseFloat(cartTotal))
            }
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }
};

/**
 * Admin: Create a coupon
 */
export const createCoupon = async (req, res) => {
    const { code, type, value, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit } = req.body;

    if (!code || !type || !value) {
        return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    try {
        const result = await query(
            `INSERT INTO coupons (code, type, value, min_order_amount, max_discount_amount, expiry_date, usage_limit)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [code.toUpperCase(), type, value, minOrderAmount || 0, maxDiscountAmount || null, expiryDate || null, usageLimit || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
};

/**
 * Admin: List all coupons
 */
export const getCoupons = async (req, res) => {
    try {
        const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
};
