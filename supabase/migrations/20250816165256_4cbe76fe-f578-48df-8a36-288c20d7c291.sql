-- Complete the store_id migration for customers table
-- Step 1: Update store_id column to use store_id_new values
UPDATE customers 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = customers.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = customers.store_id
);

-- Step 2: Change store_id column type to match 8-digit format
ALTER TABLE customers 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

-- Step 3: Drop the temporary store_id_new column
ALTER TABLE customers DROP COLUMN store_id_new;

-- Do the same for other tables
-- Orders table
UPDATE orders 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = orders.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = orders.store_id
);

ALTER TABLE orders 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE orders DROP COLUMN store_id_new;

-- Order items table
UPDATE order_items 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = order_items.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = order_items.store_id
);

ALTER TABLE order_items 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE order_items DROP COLUMN store_id_new;

-- Products table
UPDATE products 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = products.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = products.store_id
);

ALTER TABLE products 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE products DROP COLUMN store_id_new;

-- Order statuses table
UPDATE order_statuses 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = order_statuses.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = order_statuses.store_id
);

ALTER TABLE order_statuses 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE order_statuses DROP COLUMN store_id_new;

-- App settings table
UPDATE app_settings 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = app_settings.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = app_settings.store_id
);

ALTER TABLE app_settings 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE app_settings DROP COLUMN store_id_new;

-- Invoice settings table
UPDATE invoice_settings 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = invoice_settings.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = invoice_settings.store_id
);

ALTER TABLE invoice_settings 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE invoice_settings DROP COLUMN store_id_new;

-- Payments table
UPDATE payments 
SET store_id = (
  SELECT s.store_id_8digit::uuid 
  FROM stores s 
  WHERE s.store_id = payments.store_id
)
WHERE EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.store_id = payments.store_id
);

ALTER TABLE payments 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;

ALTER TABLE payments DROP COLUMN store_id_new;