-- Migration: Fix 8-digit store_id system with correct syntax

-- Step 1: Create sequence for 8-digit store IDs if not exists
CREATE SEQUENCE IF NOT EXISTS store_id_seq MINVALUE 10000000 MAXVALUE 99999999 START 10000000;

-- Step 2: Create function to generate next 8-digit store ID
CREATE OR REPLACE FUNCTION next_store_id() RETURNS TEXT AS $$
DECLARE
  next_id BIGINT;
BEGIN
  next_id := nextval('store_id_seq');
  RETURN lpad(next_id::text, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add 8-digit store_id column to stores table if not exists
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;

-- Step 4: Populate existing stores with 8-digit IDs
UPDATE stores 
SET store_id_8digit = next_store_id() 
WHERE store_id_8digit IS NULL;

-- Step 5: Make store_id_8digit NOT NULL
ALTER TABLE stores ALTER COLUMN store_id_8digit SET NOT NULL;

-- Step 6: Create unique index for store_id_8digit
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_store_id_8digit_unique ON stores(store_id_8digit);

-- Step 7: Add constraint to ensure 8-digit format
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'stores_store_id_8digit_format') THEN
    ALTER TABLE stores ADD CONSTRAINT stores_store_id_8digit_format CHECK (store_id_8digit ~ '^[0-9]{8}$');
  END IF;
END $$;

-- Step 8: Add 8-digit store_id to all store-scoped tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE order_statuses ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;

-- Step 9: Create admin users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER')),
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 10: Insert default admin user if none exists
INSERT INTO admin_users (username, password_hash, role, email) 
SELECT 'admin', crypt('admin', gen_salt('bf')), 'SUPER_ADMIN', 'admin@example.com'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- Step 11: Create admin authentication function
CREATE OR REPLACE FUNCTION authenticate_admin(input_username TEXT, input_password TEXT)
RETURNS TABLE(
  admin_id UUID,
  username VARCHAR,
  role VARCHAR,
  email TEXT
) AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  password_valid BOOLEAN := false;
BEGIN
  -- Find admin by username
  SELECT * INTO admin_record 
  FROM admin_users a
  WHERE a.username = input_username;
  
  -- Always perform password check to prevent timing attacks
  IF FOUND THEN
    -- Check if password is bcrypt hash or plain text (for migration)
    IF admin_record.password_hash LIKE '$2%' THEN
      -- Bcrypt hash
      password_valid := crypt(input_password, admin_record.password_hash) = admin_record.password_hash;
    ELSE
      -- Plain text (legacy)
      password_valid := admin_record.password_hash = input_password;
      
      -- If valid, upgrade to bcrypt
      IF password_valid THEN
        UPDATE admin_users 
        SET password_hash = crypt(input_password, gen_salt('bf'))
        WHERE id = admin_record.id;
      END IF;
    END IF;
  ELSE
    -- Perform dummy bcrypt to prevent timing attacks
    PERFORM crypt(input_password, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
  END IF;
  
  -- Return admin data if authentication successful
  IF FOUND AND password_valid THEN
    RETURN QUERY
    SELECT 
      admin_record.id,
      admin_record.username,
      admin_record.role,
      admin_record.email;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;