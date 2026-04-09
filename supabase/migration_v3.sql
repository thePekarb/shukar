-- Добавление поддержки рекомендуемых товаров (домассива ID товаров)
ALTER TABLE products ADD COLUMN IF NOT EXISTS recommended_ids integer[] DEFAULT '{}';
