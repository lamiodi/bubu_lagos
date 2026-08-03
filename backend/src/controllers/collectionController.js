import { query } from '../db.js';

export const getCollections = async (req, res) => {
  try {
    const { includeArchived } = req.query;
    
    let sql = `SELECT * FROM collections`;
    const params = [];

    if (includeArchived !== 'true') {
      sql += ` WHERE is_archived = FALSE`;
    }

    sql += ` ORDER BY display_order ASC, created_at DESC`;
    
    const result = await query(sql, params);
    
    const collections = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      bannerUrl: row.banner_url,
      accentColor: row.accent_color,
      displayOrder: row.display_order,
      isArchived: row.is_archived,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      createdAt: row.created_at
    }));
    
    res.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

export const getCollectionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const sql = isUuid 
      ? `SELECT * FROM collections WHERE id = $1`
      : `SELECT * FROM collections WHERE slug = $1`;
      
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const collection = result.rows[0];
    
    res.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      bannerUrl: collection.banner_url,
      accentColor: collection.accent_color,
      displayOrder: collection.display_order,
      isArchived: collection.is_archived,
      seoTitle: collection.seo_title,
      seoDescription: collection.seo_description,
      createdAt: collection.created_at
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

export const createCollection = async (req, res) => {
  try {
    const { name, slug, description, bannerUrl, accentColor, displayOrder, seoTitle, seoDescription } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }
    
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    const result = await query(
      `INSERT INTO collections (name, slug, description, banner_url, accent_color, display_order, seo_title, seo_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        generatedSlug,
        description || '',
        bannerUrl || null,
        accentColor || '#0F3D2E',
        displayOrder || 0,
        seoTitle || name,
        seoDescription || description || ''
      ]
    );
    
    const collection = result.rows[0];
    
    res.status(201).json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      bannerUrl: collection.banner_url,
      accentColor: collection.accent_color,
      displayOrder: collection.display_order,
      isArchived: collection.is_archived,
      seoTitle: collection.seo_title,
      seoDescription: collection.seo_description,
      createdAt: collection.created_at
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Collection name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create collection' });
  }
};

export const updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, bannerUrl, accentColor, displayOrder, isArchived, seoTitle, seoDescription } = req.body;
    
    const result = await query(
      `UPDATE collections
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           description = COALESCE($3, description),
           banner_url = COALESCE($4, banner_url),
           accent_color = COALESCE($5, accent_color),
           display_order = COALESCE($6, display_order),
           is_archived = COALESCE($7, is_archived),
           seo_title = COALESCE($8, seo_title),
           seo_description = COALESCE($9, seo_description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, slug, description, bannerUrl, accentColor, displayOrder, isArchived, seoTitle, seoDescription, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const collection = result.rows[0];
    
    res.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      bannerUrl: collection.banner_url,
      accentColor: collection.accent_color,
      displayOrder: collection.display_order,
      isArchived: collection.is_archived,
      seoTitle: collection.seo_title,
      seoDescription: collection.seo_description,
      createdAt: collection.created_at
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Collection name or slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

export const deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Archive or Delete collection
    const result = await query(
      `DELETE FROM collections WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
};
