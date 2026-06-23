import { query } from '../db.js';

export const getSettings = async (req, res) => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value FROM store_settings`
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { storeName, storeEmail, storePhone, storeAddress, currency, shippingFee } = req.body;

    const updates = [
      { key: 'store_name', value: storeName },
      { key: 'store_email', value: storeEmail },
      { key: 'store_phone', value: storePhone },
      { key: 'store_address', value: storeAddress },
      { key: 'currency', value: currency },
      { key: 'shipping_fee', value: shippingFee?.toString() || '0' }
    ];

    for (const update of updates) {
      if (update.value !== undefined) {
        await query(
          `INSERT INTO store_settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (setting_key) 
           DO UPDATE SET setting_value = $2, updated_at = NOW()`,
          [update.key, update.value]
        );
      }
    }

    const result = await query(
      `SELECT setting_key, setting_value FROM store_settings`
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const ordersResult = await query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_amount), 0) as total_revenue
       FROM orders`
    );

    const productsResult = await query(
      `SELECT COUNT(*) as total_products FROM products`
    );

    const customersResult = await query(
      `SELECT COUNT(*) as total_customers FROM customers`
    );

    const recentOrdersResult = await query(
      `SELECT id, reference, total_amount, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const lowStockResult = await query(
      `SELECT pv.id, pv.name, pv.stock_quantity, p.name as product_name
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE pv.stock_quantity < 10
       ORDER BY pv.stock_quantity ASC
       LIMIT 5`
    );

    res.json({
      totalOrders: parseInt(ordersResult.rows[0].total_orders),
      totalRevenue: parseFloat(ordersResult.rows[0].total_revenue),
      totalProducts: parseInt(productsResult.rows[0].total_products),
      totalCustomers: parseInt(customersResult.rows[0].total_customers),
      recentOrders: recentOrdersResult.rows.map(row => ({
        id: row.id,
        reference: row.reference,
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        createdAt: row.created_at
      })),
      lowStockProducts: lowStockResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        productName: row.product_name,
        stockQuantity: row.stock_quantity
      }))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};
