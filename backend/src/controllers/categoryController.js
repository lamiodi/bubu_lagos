import { query } from '../db.js';

export const getCategories = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM categories ORDER BY created_at DESC`
    );
    
    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      createdAt: row.created_at
    }));
    
    res.json({ categories });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT * FROM categories WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const category = result.rows[0];
    
    res.json({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.image_url,
      createdAt: category.created_at
    });
    
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const result = await query(
      `INSERT INTO categories (name, description, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, imageUrl]
    );
    
    const category = result.rows[0];
    
    res.status(201).json({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.image_url,
      createdAt: category.created_at
    });
    
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Check for duplicate name error
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Category name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl } = req.body;
    
    const result = await query(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url)
       WHERE id = $4
       RETURNING *`,
      [name, description, imageUrl, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const category = result.rows[0];
    
    res.json({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.image_url,
      createdAt: category.created_at
    });
    
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has products
    const productsResult = await query(
      `SELECT COUNT(*) as product_count FROM products WHERE category_id = $1`,
      [id]
    );
    
    if (parseInt(productsResult.rows[0].product_count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing products. Remove products first.' 
      });
    }
    
    const result = await query(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};