import { query, getClient } from '../db.js';

export const getProducts = async (req, res) => {
  try {
    const { category, collection, search, minPrice, maxPrice, sort, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.description as category_description,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'price', pv.price,
              'stockQuantity', pv.stock_quantity
            )
          ) FILTER (WHERE pv.id IS NOT NULL), '[]'
        ) as variants,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', col.id,
                'name', col.name,
                'slug', col.slug,
                'description', col.description,
                'accentColor', col.accent_color
              )
            )
            FROM product_collections pc
            JOIN collections col ON pc.collection_id = col.id
            WHERE pc.product_id = p.id
          ), '[]'
        ) as collections
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (category) {
      if (Array.isArray(category)) {
        params.push(category);
        conditions.push(`(c.slug = ANY($${params.length}) OR c.name = ANY($${params.length}) OR c.id::text = ANY($${params.length}))`);
      } else {
        params.push(category);
        conditions.push(`(c.slug = $${params.length} OR c.name ILIKE $${params.length} OR c.id::text = $${params.length})`);
      }
    }

    if (collection) {
      let collectionList = Array.isArray(collection)
        ? collection
        : (typeof collection === 'string' && collection.includes(','))
        ? collection.split(',')
        : [collection];
      collectionList = collectionList.filter(Boolean);

      if (collectionList.length > 0) {
        params.push(collectionList);
        conditions.push(`EXISTS (
          SELECT 1 FROM product_collections pc_filter
          JOIN collections col_filter ON pc_filter.collection_id = col_filter.id
          WHERE pc_filter.product_id = p.id AND (
            col_filter.slug = ANY($${params.length}) OR 
            col_filter.name = ANY($${params.length}) OR 
            col_filter.id::text = ANY($${params.length})
          )
        )`);
      }
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
      sku: row.sku || `BL-${row.category_slug ? row.category_slug.toUpperCase() : 'GEN'}-${row.id.slice(0, 4)}`,
      description: row.description,
      basePrice: parseFloat(row.base_price),
      images: row.images || [],
      videoUrl: row.video_url,
      categoryId: row.category_id,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
        description: row.category_description
      } : null,
      collections: row.collections || [],
      colorPalette: row.color_palette || [],
      suggestedProductIds: row.suggested_product_ids || [],
      variants: Array.isArray(row.variants) ? row.variants.map(v => ({
        id: v.id,
        name: v.name,
        price: parseFloat(v.price),
        stockQuantity: v.stockQuantity
      })) : [],
      createdAt: row.created_at
    }));
    
    res.json({
      products,
      categoryInfo: category && result.rows.length > 0 ? {
        name: result.rows[0].category_name,
        slug: result.rows[0].category_slug,
        description: result.rows[0].category_description
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const { productId, categoryId, targetCategory, limit = 4 } = req.query;
    
    let products = [];
    let currentProduct = null;

    if (productId) {
      const currentRes = await query(`SELECT * FROM products WHERE id = $1`, [productId]);
      if (currentRes.rows.length > 0) {
        currentProduct = currentRes.rows[0];
      }
    }

    // Tier 1: Explicit Admin-suggested product IDs
    if (currentProduct && Array.isArray(currentProduct.suggested_product_ids) && currentProduct.suggested_product_ids.length > 0) {
      const explicitRes = await query(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ANY($1::uuid[]) AND p.id != $2
         LIMIT $3`,
        [currentProduct.suggested_product_ids, productId, limit]
      );
      products = explicitRes.rows;
    }

    // Tier 2: Color-palette matching (e.g. matching Turbans to a Bubu by shared colors)
    if (products.length < limit && currentProduct && Array.isArray(currentProduct.color_palette) && currentProduct.color_palette.length > 0) {
      const remainingLimit = limit - products.length;
      const excludeIds = [productId, ...products.map(p => p.id)];
      
      let categoryFilter = '';
      const params = [currentProduct.color_palette, excludeIds, remainingLimit];

      if (targetCategory) {
        params.push(targetCategory);
        categoryFilter = `AND (c.slug = $4 OR c.name ILIKE $4)`;
      }

      const colorRes = await query(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.color_palette && $1::text[]
           AND p.id != ALL($2::uuid[])
           ${categoryFilter}
         LIMIT $3`,
        params
      );
      products = [...products, ...colorRes.rows];
    }

    // Tier 3: Same or target category fallback
    if (products.length < limit) {
      const remainingLimit = limit - products.length;
      const excludeIds = [productId || '00000000-0000-0000-0000-000000000000', ...products.map(p => p.id)];
      let catId = categoryId;
      
      if (targetCategory) {
        const catRes = await query(`SELECT id FROM categories WHERE slug = $1 OR name ILIKE $1 LIMIT 1`, [targetCategory]);
        if (catRes.rows.length > 0) catId = catRes.rows[0].id;
      }

      if (catId) {
        const catProductsRes = await query(
          `SELECT p.*, c.name as category_name, c.slug as category_slug
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.category_id = $1 AND p.id != ALL($2::uuid[])
           LIMIT $3`,
          [catId, excludeIds, remainingLimit]
        );
        products = [...products, ...catProductsRes.rows];
      }
    }

    // Tier 4: General latest products fallback
    if (products.length < limit) {
      const remainingLimit = limit - products.length;
      const excludeIds = [productId || '00000000-0000-0000-0000-000000000000', ...products.map(p => p.id)];
      const latestResult = await query(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id != ALL($1::uuid[])
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [excludeIds, remainingLimit]
      );
      products = [...products, ...latestResult.rows];
    }

    res.json({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: parseFloat(p.base_price),
        images: p.images || [],
        videoUrl: p.video_url,
        colorPalette: p.color_palette || [],
        suggestedProductIds: p.suggested_product_ids || [],
        category: p.category_id ? {
          id: p.category_id,
          name: p.category_name,
          slug: p.category_slug
        } : null
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
    const product = await getProductByIdInternal(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    let { name, description, basePrice, images, videoUrl, categoryId, collectionIds, collections, variants, colorPalette, suggestedProductIds } = req.body;
    
    if (req.files) {
      if (req.files['images']) {
        const uploadedImages = req.files['images'].map(file => file.path);
        images = images ? [...(Array.isArray(images) ? images : [images]), ...uploadedImages] : uploadedImages;
      }
      if (req.files['video']) {
        videoUrl = req.files['video'][0].path;
      }
    }

    let targetCollectionIds = collectionIds !== undefined ? collectionIds : collections;

    if (typeof variants === 'string') {
      try { variants = JSON.parse(variants); } catch (e) {}
    }
    if (typeof targetCollectionIds === 'string') {
      try { targetCollectionIds = JSON.parse(targetCollectionIds); } catch (e) { targetCollectionIds = [targetCollectionIds]; }
    }
    if (typeof colorPalette === 'string') {
      try { colorPalette = JSON.parse(colorPalette); } catch (e) { colorPalette = []; }
    }
    if (typeof suggestedProductIds === 'string') {
      try { suggestedProductIds = JSON.parse(suggestedProductIds); } catch (e) { suggestedProductIds = []; }
    }
    
    if (!name || !basePrice || !categoryId) {
      return res.status(400).json({ error: 'Name, basePrice, and categoryId are required' });
    }
    
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const productResult = await client.query(
        `INSERT INTO products (name, description, base_price, images, video_url, category_id, color_palette, suggested_product_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          name,
          description,
          basePrice,
          Array.isArray(images) ? images : [],
          videoUrl || null,
          categoryId,
          Array.isArray(colorPalette) ? colorPalette : [],
          Array.isArray(suggestedProductIds) ? suggestedProductIds : []
        ]
      );
      
      const product = productResult.rows[0];
      const productId = product.id;
      
      // Insert product collections mapping
      if (Array.isArray(targetCollectionIds) && targetCollectionIds.length > 0) {
        for (const colId of targetCollectionIds) {
          await client.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [productId, colId]
          );
        }
      }
      
      // Insert variants
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          await client.query(
            `INSERT INTO product_variants (product_id, name, price, stock_quantity)
             VALUES ($1, $2, $3, $4)`,
            [productId, variant.name, variant.price || basePrice, variant.stockQuantity || 0]
          );
        }
      }
      
      await client.query('COMMIT');
      
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
    let { name, description, basePrice, images, videoUrl, categoryId, collectionIds, collections, variants, colorPalette, suggestedProductIds } = req.body;
    
    let existingImages = [];
    if (images !== undefined) {
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          existingImages = Array.isArray(parsed) ? parsed : [images];
        } catch (e) {
          existingImages = [images];
        }
      } else if (Array.isArray(images)) {
        existingImages = images;
      }
    }
    
    if (req.files) {
      if (req.files['images']) {
        const uploadedImages = req.files['images'].map(file => file.path);
        existingImages = [...existingImages, ...uploadedImages];
      }
      if (req.files['video']) {
        videoUrl = req.files['video'][0].path;
      }
    }

    let targetCollectionIds = collectionIds !== undefined ? collectionIds : collections;

    if (typeof variants === 'string') {
      try { variants = JSON.parse(variants); } catch (e) {}
    }
    if (typeof targetCollectionIds === 'string') {
      try { targetCollectionIds = JSON.parse(targetCollectionIds); } catch (e) { targetCollectionIds = [targetCollectionIds]; }
    }
    if (typeof colorPalette === 'string') {
      try { colorPalette = JSON.parse(colorPalette); } catch (e) {}
    }
    if (typeof suggestedProductIds === 'string') {
      try { suggestedProductIds = JSON.parse(suggestedProductIds); } catch (e) {}
    }

    let finalVideoUrl = videoUrl;
    if (videoUrl === '') { finalVideoUrl = null; }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE products 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             base_price = COALESCE($3, base_price),
             images = $4,
             video_url = CASE WHEN $5::text = '' THEN NULL ELSE COALESCE($5, video_url) END,
             category_id = COALESCE($6, category_id),
             color_palette = CASE WHEN $7::text[] IS NOT NULL THEN $7 ELSE color_palette END,
             suggested_product_ids = CASE WHEN $8::text[] IS NOT NULL THEN $8 ELSE suggested_product_ids END
         WHERE id = $9
         RETURNING *`,
        [
          name,
          description,
          basePrice,
          existingImages,
          videoUrl === '' ? '' : finalVideoUrl,
          categoryId,
          Array.isArray(colorPalette) ? colorPalette : null,
          Array.isArray(suggestedProductIds) ? suggestedProductIds : null,
          id
        ]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      // Update product_collections mapping
      if (Array.isArray(targetCollectionIds)) {
        await client.query('DELETE FROM product_collections WHERE product_id = $1', [id]);
        for (const colId of targetCollectionIds) {
          await client.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, colId]
          );
        }
      }

      // Sync variants
      if (variants) {
        const existingVariantsResult = await client.query(
          'SELECT id FROM product_variants WHERE product_id = $1',
          [id]
        );
        const existingIds = existingVariantsResult.rows.map(v => v.id);
        const providedIds = variants.filter(v => v.id).map(v => v.id);

        const toDelete = existingIds.filter(id => !providedIds.includes(id));
        if (toDelete.length > 0) {
          await client.query('DELETE FROM product_variants WHERE id = ANY($1)', [toDelete]);
        }

        for (const v of variants) {
          if (v.id) {
            await client.query(
              `UPDATE product_variants 
               SET name = $1, price = $2, stock_quantity = $3
               WHERE id = $4 AND product_id = $5`,
              [v.name, v.price || basePrice, v.stockQuantity || 0, v.id, id]
            );
          } else {
            await client.query(
              `INSERT INTO product_variants (product_id, name, price, stock_quantity)
               VALUES ($1, $2, $3, $4)`,
              [id, v.name, v.price || basePrice, v.stockQuantity || 0]
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

async function getProductByIdInternal(productId, client = null) {
  const queryFunc = client ? client.query.bind(client) : query;
  
  const productResult = await queryFunc(
    `SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
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

  const collectionsResult = await queryFunc(
    `SELECT col.id, col.name, col.slug, col.description, col.accent_color
     FROM product_collections pc
     JOIN collections col ON pc.collection_id = col.id
     WHERE pc.product_id = $1`,
    [productId]
  );
  
  const product = productResult.rows[0];
  
  return {
    id: product.id,
    name: product.name,
    sku: product.sku || `BL-${product.category_slug ? product.category_slug.toUpperCase() : 'GEN'}-${product.id.slice(0, 4)}`,
    description: product.description,
    basePrice: parseFloat(product.base_price),
    images: product.images || [],
    videoUrl: product.video_url,
    categoryId: product.category_id,
    category: product.category_id ? {
      id: product.category_id,
      name: product.category_name,
      slug: product.category_slug,
      description: product.category_description
    } : null,
    collections: collectionsResult.rows.map(col => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description,
      accentColor: col.accent_color
    })),
    colorPalette: product.color_palette || [],
    suggestedProductIds: product.suggested_product_ids || [],
    variants: variantsResult.rows.map(v => ({
      id: v.id,
      name: v.name,
      price: parseFloat(v.price),
      stockQuantity: v.stock_quantity
    })),
    createdAt: product.created_at
  };
}

export const createProductsBulk = async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Valid products array is required' });
    }
    
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      const createdProducts = [];
      
      for (const p of products) {
        let { name, description, basePrice, images, videoUrl, categoryId, collectionIds, collections, variants } = p;
        if (!name || !basePrice || !categoryId) continue;

        let targetCollectionIds = collectionIds !== undefined ? collectionIds : collections;
        if (typeof targetCollectionIds === 'string') {
          try { targetCollectionIds = JSON.parse(targetCollectionIds); } catch (e) { targetCollectionIds = [targetCollectionIds]; }
        }
        
        const productResult = await client.query(
          `INSERT INTO products (name, description, base_price, images, video_url, category_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [name, description || '', basePrice, Array.isArray(images) ? images : [], videoUrl || null, categoryId]
        );
        
        const productId = productResult.rows[0].id;
        
        if (Array.isArray(targetCollectionIds)) {
          for (const colId of targetCollectionIds) {
            await client.query(
              `INSERT INTO product_collections (product_id, collection_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [productId, colId]
            );
          }
        }

        if (variants && variants.length > 0) {
          for (const variant of variants) {
            await client.query(
              `INSERT INTO product_variants (product_id, name, price, stock_quantity) VALUES ($1, $2, $3, $4)`,
              [productId, variant.name || 'Default', variant.price || basePrice, variant.stockQuantity || 0]
            );
          }
        }
        createdProducts.push(productId);
      }
      
      await client.query('COMMIT');
      res.status(201).json({ message: `Successfully imported ${createdProducts.length} products`, count: createdProducts.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to import products in bulk' });
  }
};