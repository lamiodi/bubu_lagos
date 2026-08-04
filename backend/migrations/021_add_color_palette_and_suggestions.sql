-- Migration 021: Add cloth color palette and smart suggestions columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_palette text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_product_ids text[] DEFAULT '{}';
