import { query, getClient } from '../db.js';

export const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.description as category_description,
        json_agg(
          json_build_object(
            'id', pv.id,
            'name', pv.name,
            'price', pv.price,
            'stockQuantity', pv.stock_quantity
          )
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (category) {
      params.push(category);
      conditions.push(`c.name = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (minPrice) {
      params.push(parseFloat(minPrice));
      conditions.push(`p.base_price >= $${params.length}`);
    }

    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      conditions.push(`p.base_price <= $${params.length}`);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }
    
    sql += ` GROUP BY p.id, c.id `;
    
    // Sorting
    switch (sort) {
      case 'price_low':
        sql += ` ORDER BY p.base_price ASC `;
        break;
      case 'price_high':
        sql += ` ORDER BY p.base_price DESC `;
        break;
      case 'newest':
      default:
        sql += ` ORDER BY p.created_at DESC `;
        break;
    }

    sql += ` LIMIT $${params.length + 1} `;
    params.push(parseInt(limit));
    
    const result = await query(sql, params);
    
    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: parseFloat(row.base_price),
      images: row.images || [],
      videoUrl: row.video_url,
      categoryId: row.category_id,
      category: {
        id: row.category_id,
        name: row.category_name,
        description: row.category_description
      },
      variants: row.variants.filter(v => v.id !== null),
      createdAt: row.created_at
    }));
    
    res.json({
      products,
      categoryInfo: category && result.rows.length > 0 ? {
        name: result.rows[0].category_name,
        description: result.rows[0].category_description
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

/**
 * Smart Product Recommendations
 * Returns related products (same category) and trending/new products.
 */
export const getRecommendations = async (req, res) => {
  try {
    const { productId, categoryId, limit = 4 } = req.query;
    
    let products = [];

    if (productId && categoryId) {
      // 1. Related Products (Same category, excluding current)
      const relatedResult = await query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.category_id = $1 AND p.id != $2
         LIMIT $3`,
        [categoryId, productId, limit]
      );
      products = relatedResult.rows;
    }

    // if we don't have enough related products, fill with latest
    if (products.length < limit) {
      const remainingLimit = limit - products.length;
      const latestResult = await query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id NOT IN (${products.length > 0 ? products.map((_, i) => `$${i + 1}`).join(',') : "''"})
         ORDER BY p.created_at DESC
         LIMIT $${products.length + 1}`,
        [...products.map(p => p.id), remainingLimit]
      );
      products = [...products, ...latestResult.rows];
    }

    res.json({
      products: products.map(p => ({
        ...p,
        basePrice: parseFloat(p.base_price),
        images: p.images || []
      }))
    });
    
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const productResult = await query(
      `SELECT 
        p.*,
        c.name as category_name,
        c.description as category_description
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const variantsResult = await query(
      `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at`,
      [id]
    );
    
    const product = productResult.rows[0];
    
    const response = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      images: product.images || [],
      videoUrl: product.video_url,
      categoryId: product.category_id,
      category: {
        id: product.category_id,
        name: product.category_name,
        description: product.category_description
      },
      variants: variantsResult.rows.map(v => ({
        id: v.id,
        name: v.name,
        price: parseFloat(v.price),
        stockQuantity: v.stock_quantity
      })),
      createdAt: product.created_at
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    let { name, description, basePrice, images, videoUrl, categoryId, variants } = req.body;
    
    // Handle Cloudinary uploads
    if (req.files) {
      if (req.files['images']) {
        const uploadedImages = req.files['images'].map(file => file.path);
        images = images ? [...(Array.isArray(images) ? images : [images]), ...uploadedImages] : uploadedImages;
      }
      if (req.files['video']) {
        videoUrl = req.files['video'][0].path;
      }
    }

    // Parse variants if they come as a string (happens with multipart/form-data)
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        console.warn('Failed to parse variants JSON', e);
      }
    }
    
    // Validate required fields
    if (!name || !basePrice || !categoryId) {
      return res.status(400).json({ error: 'Name, basePrice, and categoryId are required' });
    }
    
    // Start transaction
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert product
      const productResult = await client.query(
        `INSERT INTO products (name, description, base_price, images, video_url, category_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description, basePrice, Array.isArray(images) ? images : [], videoUrl || null, categoryId]
      );
      
      const product = productResult.rows[0];
      const productId = product.id;
      
      // Insert variants if provided
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          await client.query(
            `INSERT INTO product_variants (product_id, name, price, stock_quantity)
             VALUES ($1, $2, $3, $4)`,
            [productId, variant.name, variant.price, variant.stockQuantity || 0]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Fetch the complete product with variants
      const completeProduct = await getProductByIdInternal(productId, client);
      
      res.status(201).json(completeProduct);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, basePrice, images, videoUrl, categoryId, variants } = req.body;
    
    // Handle Cloudinary uploads
    if (req.files) {
      if (req.files['images']) {
        const uploadedImages = req.files['images'].map(file => file.path);
        // images might be a single string or an array depending on how it's sent
        let existingImages = images;
        if (typeof images === 'string') {
          try {
            existingImages = JSON.parse(images);
          } catch (e) {
            existingImages = [images];
          }
        }
        images = existingImages ? [...(Array.isArray(existingImages) ? existingImages : [existingImages]), ...uploadedImages] : uploadedImages;
      }
      if (req.files['video']) {
        videoUrl = req.files['video'][0].path;
      }
    }

    // Parse variants if they come as a string
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        console.warn('Failed to parse variants JSON', e);
      }
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE products 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             base_price = COALESCE($3, base_price),
             images = COALESCE($4, images),
             video_url = COALESCE($5, video_url),
             category_id = COALESCE($6, category_id)
         WHERE id = $7
         RETURNING *`,
        [name, description, basePrice, Array.isArray(images) ? images : null, videoUrl, categoryId, id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      // Sync variants if provided
      if (variants) {
        // Get existing variants
        const existingVariantsResult = await client.query(
          'SELECT id FROM product_variants WHERE product_id = $1',
          [id]
        );
        const existingIds = existingVariantsResult.rows.map(v => v.id);
        const providedIds = variants.filter(v => v.id).map(v => v.id);

        // Delete variants not in provided list
        const toDelete = existingIds.filter(id => !providedIds.includes(id));
        if (toDelete.length > 0) {
          await client.query(
            'DELETE FROM product_variants WHERE id = ANY($1)',
            [toDelete]
          );
        }

        // Update or create variants
        for (const v of variants) {
          if (v.id) {
            await client.query(
              `UPDATE product_variants 
               SET name = $1, price = $2, stock_quantity = $3
               WHERE id = $4 AND product_id = $5`,
              [v.name, v.price, v.stockQuantity || 0, v.id, id]
            );
          } else {
            await client.query(
              `INSERT INTO product_variants (product_id, name, price, stock_quantity)
               VALUES ($1, $2, $3, $4)`,
              [id, v.name, v.price, v.stockQuantity || 0]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      const completeProduct = await getProductByIdInternal(id, client);
      res.json(completeProduct);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const updateVariantStock = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { stockQuantity } = req.body;
    
    if (stockQuantity === undefined || stockQuantity < 0) {
      return res.status(400).json({ error: 'Valid stockQuantity is required' });
    }
    
    const result = await query(
      `UPDATE product_variants 
       SET stock_quantity = $1
       WHERE id = $2 AND product_id = $3
       RETURNING *`,
      [stockQuantity, variantId, productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    const variant = result.rows[0];
    
    res.json({
      id: variant.id,
      name: variant.name,
      price: parseFloat(variant.price),
      stockQuantity: variant.stock_quantity,
      productId: variant.product_id
    });
    
  } catch (error) {
    console.error('Error updating variant stock:', error);
    res.status(500).json({ error: 'Failed to update variant stock' });
  }
};

// Helper function to get product by ID (internal use)
async function getProductByIdInternal(productId, client = null) {
  const queryFunc = client ? client.query.bind(client) : query;
  
  const productResult = await queryFunc(
    `SELECT 
      p.*,
      c.name as category_name,
      c.description as category_description
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = $1`,
    [productId]
  );
  
  if (productResult.rows.length === 0) {
    return null;
  }
  
  const variantsResult = await queryFunc(
    `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at`,
    [productId]
  );
  
  const product = productResult.rows[0];
  
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: parseFloat(product.base_price),
    images: product.images || [],
    videoUrl: product.video_url,
    categoryId: product.category_id,
    category: {
      id: product.category_id,
      name: product.category_name,
      description: product.category_description
    },
    variants: variantsResult.rows.map(v => ({
      id: v.id,
      name: v.name,
      price: parseFloat(v.price),
      stockQuantity: v.stock_quantity
    })),
    createdAt: product.created_at
  };
}