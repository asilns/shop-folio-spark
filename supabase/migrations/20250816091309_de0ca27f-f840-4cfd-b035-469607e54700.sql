-- Migration: Refactor to 8-digit numeric store_id system with strict tenant isolation

-- Step 1: Create sequence for 8-digit store IDs
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

-- Step 3: Add 8-digit store_id column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_id_8digit TEXT UNIQUE;

-- Step 4: Add constraint to ensure 8-digit format
ALTER TABLE stores ADD CONSTRAINT stores_store_id_8digit_format CHECK (store_id_8digit ~ '^[0-9]{8}$');

-- Step 5: Populate existing stores with 8-digit IDs
UPDATE stores 
SET store_id_8digit = next_store_id() 
WHERE store_id_8digit IS NULL;

-- Step 6: Make store_id_8digit NOT NULL after population
ALTER TABLE stores ALTER COLUMN store_id_8digit SET NOT NULL;

-- Step 7: Create admin users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER')),
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 8: Create admin authentication function
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

-- Step 9: Insert default admin user if none exists
INSERT INTO admin_users (username, password_hash, role, email) 
SELECT 'admin', crypt('admin', gen_salt('bf')), 'SUPER_ADMIN', 'admin@example.com'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- Step 10: Add 8-digit store_id to all store-scoped tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE order_statuses ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS store_id_8digit TEXT;

-- Step 11: Populate 8-digit store_id in all store-scoped tables
UPDATE customers SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = customers.store_id
) WHERE store_id_8digit IS NULL;

UPDATE products SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = products.store_id
) WHERE store_id_8digit IS NULL;

UPDATE orders SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = orders.store_id
) WHERE store_id_8digit IS NULL;

UPDATE order_items SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = order_items.store_id
) WHERE store_id_8digit IS NULL;

UPDATE payments SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = payments.store_id
) WHERE store_id_8digit IS NULL;

UPDATE app_settings SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = app_settings.store_id
) WHERE store_id_8digit IS NULL;

UPDATE order_statuses SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = order_statuses.store_id
) WHERE store_id_8digit IS NULL;

UPDATE invoice_settings SET store_id_8digit = (
  SELECT store_id_8digit FROM stores WHERE stores.store_id = invoice_settings.store_id
) WHERE store_id_8digit IS NULL;

-- Step 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_store_id_8digit ON customers(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_products_store_id_8digit ON products(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_orders_store_id_8digit ON orders(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id_8digit ON order_items(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_payments_store_id_8digit ON payments(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_app_settings_store_id_8digit ON app_settings(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_order_statuses_store_id_8digit ON order_statuses(store_id_8digit);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_store_id_8digit ON invoice_settings(store_id_8digit);

-- Step 13: Create updated store auth function with 8-digit IDs
CREATE OR REPLACE FUNCTION authenticate_store_user_with_8digit_id(
  p_store_input text, 
  p_username character varying, 
  p_password text
)
RETURNS TABLE(
  user_id uuid, 
  store_name character varying, 
  username character varying, 
  pin character, 
  role character varying, 
  subscription_date date, 
  subscription_expiry date, 
  last_login timestamp with time zone, 
  store_id uuid,
  store_id_8digit text,
  current_slug text, 
  needs_redirect boolean, 
  store_active boolean, 
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_record public.store_users%ROWTYPE;
  store_resolution RECORD;
  store_slug_input text;
  store_name_input text;
  dummy_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  password_valid boolean := false;
BEGIN
  -- Trim and normalize inputs
  store_name_input := trim(p_store_input);
  store_slug_input := lower(store_name_input);
  store_slug_input := regexp_replace(store_slug_input, '[^a-z0-9]+', '-', 'g');
  store_slug_input := regexp_replace(store_slug_input, '^-+|-+$', '', 'g');
  store_slug_input := regexp_replace(store_slug_input, '-+', '-', 'g');
  
  -- Resolve store by slug or name
  SELECT s.id as store_id, s.store_id_8digit, s.store_slug as current_slug, s.is_active, s.store_name,
         CASE WHEN s.store_slug = store_slug_input THEN FALSE ELSE TRUE END as needs_redirect
  INTO store_resolution
  FROM public.stores s
  WHERE lower(s.store_slug) = store_slug_input 
     OR lower(trim(s.store_name)) = lower(store_name_input);
  
  -- If not found by current slug/name, try slug history
  IF NOT FOUND THEN
    SELECT s.id as store_id, s.store_id_8digit, s.store_slug as current_slug, s.is_active, s.store_name, TRUE as needs_redirect
    INTO store_resolution
    FROM public.stores s
    JOIN public.store_slug_history h ON s.id = h.store_id
    WHERE lower(h.old_slug) = store_slug_input;
  END IF;
  
  -- If store not found, perform dummy bcrypt
  IF NOT FOUND THEN
    PERFORM crypt(p_password, dummy_hash);
    RETURN QUERY
    SELECT 
      NULL::uuid, NULL::character varying, NULL::character varying, NULL::character, NULL::character varying,
      NULL::date, NULL::date, NULL::timestamp with time zone, NULL::uuid, NULL::text, NULL::text,
      NULL::boolean, NULL::boolean, 'INVALID_CREDENTIALS'::text;
    RETURN;
  END IF;
  
  -- Check if store is active
  IF NOT store_resolution.is_active THEN
    PERFORM crypt(p_password, dummy_hash);
    RETURN QUERY
    SELECT 
      NULL::uuid, store_resolution.store_name, NULL::character varying, NULL::character, NULL::character varying,
      NULL::date, NULL::date, NULL::timestamp with time zone, store_resolution.store_id, store_resolution.store_id_8digit,
      store_resolution.current_slug, store_resolution.needs_redirect, FALSE, 'STORE_DEACTIVATED'::text;
    RETURN;
  END IF;
  
  -- Find user by username within this store
  SELECT u.* INTO user_record 
  FROM public.store_users u
  WHERE lower(trim(u.username)) = lower(trim(p_username))
    AND u.store_id = store_resolution.store_id;
  
  -- Verify password
  IF FOUND THEN
    IF user_record.password_hash LIKE '$2%' THEN
      password_valid := crypt(p_password, user_record.password_hash) = user_record.password_hash;
    ELSE
      password_valid := user_record.password_hash = p_password;
      IF password_valid THEN
        UPDATE public.store_users 
        SET password_hash = crypt(p_password, gen_salt('bf'))
        WHERE id = user_record.id;
      END IF;
    END IF;
  ELSE
    PERFORM crypt(p_password, dummy_hash);
    password_valid := false;
  END IF;
  
  -- Return result
  IF FOUND AND password_valid THEN
    UPDATE public.store_users 
    SET last_login = now() 
    WHERE id = user_record.id;
    
    RETURN QUERY
    SELECT 
      user_record.id, store_resolution.store_name, user_record.username, user_record.pin, user_record.role,
      user_record.subscription_date, user_record.subscription_expiry, now(), user_record.store_id,
      store_resolution.store_id_8digit, store_resolution.current_slug, store_resolution.needs_redirect,
      TRUE, 'SUCCESS'::text;
  ELSE
    RETURN QUERY
    SELECT 
      NULL::uuid, store_resolution.store_name, NULL::character varying, NULL::character, NULL::character varying,
      NULL::date, NULL::date, NULL::timestamp with time zone, store_resolution.store_id, store_resolution.store_id_8digit,
      store_resolution.current_slug, store_resolution.needs_redirect, TRUE, 'INVALID_CREDENTIALS'::text;
  END IF;
  
  RETURN;
END;
$$;