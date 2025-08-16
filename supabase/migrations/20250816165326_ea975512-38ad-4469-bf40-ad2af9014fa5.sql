-- Drop all foreign key constraints that reference store_id
-- First, let's check what constraints exist
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop foreign key constraints on customers table
    FOR constraint_record IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'customers' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%store%'
    LOOP
        EXECUTE 'ALTER TABLE customers DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
    
    -- Drop foreign key constraints on other tables as well
    FOR constraint_record IN 
        SELECT table_name, constraint_name
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%store%'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- Now safely change all store_id columns to character(8)
-- Update customers table
ALTER TABLE customers 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE customers DROP COLUMN IF EXISTS store_id_new;

-- Update orders table  
ALTER TABLE orders 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE orders DROP COLUMN IF EXISTS store_id_new;

-- Update order_items table
ALTER TABLE order_items 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE order_items DROP COLUMN IF EXISTS store_id_new;

-- Update products table
ALTER TABLE products 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE products DROP COLUMN IF EXISTS store_id_new;

-- Update order_statuses table
ALTER TABLE order_statuses 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE order_statuses DROP COLUMN IF EXISTS store_id_new;

-- Update app_settings table
ALTER TABLE app_settings 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE app_settings DROP COLUMN IF EXISTS store_id_new;

-- Update invoice_settings table
ALTER TABLE invoice_settings 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE invoice_settings DROP COLUMN IF EXISTS store_id_new;

-- Update payments table
ALTER TABLE payments 
  ALTER COLUMN store_id TYPE character(8) 
  USING store_id_new;
ALTER TABLE payments DROP COLUMN IF EXISTS store_id_new;