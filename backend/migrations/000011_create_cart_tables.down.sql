-- Drop cart-related tables
DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
DROP TRIGGER IF EXISTS carts_updated_at ON carts;

DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
