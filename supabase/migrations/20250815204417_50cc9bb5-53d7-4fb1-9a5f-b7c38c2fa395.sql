-- Remove legacy user management and create store-centric model

-- Add is_active column to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create store_users table (replacing managed_users for consistency)
CREATE TABLE IF NOT EXISTS public.store_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('STORE_ADMIN','DATA_ENTRY','VIEWER')),
  last_login TIMESTAMP WITH TIME ZONE,
  subscription_date DATE,
  subscription_expiry DATE,
  pin CHAR(4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, username)
);

-- Enable RLS on store_users
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;

-- Create policies for store_users
CREATE POLICY "Service role can manage store users" 
ON public.store_users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Migrate data from managed_users to store_users
INSERT INTO public.store_users (
  store_id, username, password_hash, role, last_login, 
  subscription_date, subscription_expiry, pin, created_at, updated_at
)
SELECT 
  store_id, username, password_hash, 
  COALESCE(role, 'STORE_ADMIN') as role,
  last_login, subscription_date, subscription_expiry, pin,
  created_at, updated_at
FROM public.managed_users
WHERE store_id IS NOT NULL
ON CONFLICT (store_id, username) DO NOTHING;

-- Create trigger to prevent deletion of last STORE_ADMIN
CREATE OR REPLACE FUNCTION public.prevent_last_store_admin_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're deleting or updating a STORE_ADMIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'STORE_ADMIN') OR 
     (TG_OP = 'UPDATE' AND OLD.role = 'STORE_ADMIN' AND NEW.role != 'STORE_ADMIN') THEN
    
    -- Check if this is the last STORE_ADMIN for this store
    IF (SELECT COUNT(*) FROM public.store_users 
        WHERE store_id = COALESCE(OLD.store_id, NEW.store_id) 
        AND role = 'STORE_ADMIN' 
        AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last STORE_ADMIN from a store';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_last_store_admin_removal_trigger
  BEFORE UPDATE OR DELETE ON public.store_users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_store_admin_removal();

-- Update authentication function for store_users
CREATE OR REPLACE FUNCTION public.authenticate_store_user_with_store_v2(
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
  current_slug text, 
  needs_redirect boolean,
  store_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_record public.store_users%ROWTYPE;
  store_resolution RECORD;
  store_slug_input text;
BEGIN
  -- Generate slug from store input (normalize)
  store_slug_input := lower(trim(p_store_input));
  store_slug_input := regexp_replace(store_slug_input, '[^a-z0-9]+', '-', 'g');
  store_slug_input := regexp_replace(store_slug_input, '^-+|-+$', '', 'g');
  store_slug_input := regexp_replace(store_slug_input, '-+', '-', 'g');
  
  -- Resolve store by slug
  SELECT s.id as store_id, s.store_slug as current_slug, s.is_active,
         CASE WHEN s.store_slug = store_slug_input THEN FALSE ELSE TRUE END as needs_redirect
  INTO store_resolution
  FROM public.stores s
  WHERE s.store_slug = store_slug_input;
  
  -- If not found by current slug, try slug history
  IF NOT FOUND THEN
    SELECT s.id as store_id, s.store_slug as current_slug, s.is_active, TRUE as needs_redirect
    INTO store_resolution
    FROM public.stores s
    JOIN public.store_slug_history h ON s.id = h.store_id
    WHERE h.old_slug = store_slug_input;
  END IF;
  
  -- If store not found at all, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if store is active
  IF NOT store_resolution.is_active THEN
    -- Return store info but mark as inactive
    RETURN QUERY
    SELECT 
      NULL::uuid as user_id,
      NULL::character varying as store_name,
      NULL::character varying as username,
      NULL::character as pin,
      NULL::character varying as role,
      NULL::date as subscription_date,
      NULL::date as subscription_expiry,
      NULL::timestamp with time zone as last_login,
      store_resolution.store_id,
      store_resolution.current_slug,
      store_resolution.needs_redirect,
      FALSE as store_active
    ;
    RETURN;
  END IF;
  
  -- Find user by username within this store
  SELECT u.* INTO user_record 
  FROM public.store_users u
  WHERE u.username = p_username 
    AND u.store_id = store_resolution.store_id;
  
  -- If user not found in this store, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check password
  IF user_record.password_hash = p_password THEN
    -- Update last login
    UPDATE public.store_users 
    SET last_login = now() 
    WHERE public.store_users.id = user_record.id;
    
    -- Return user data with store resolution info
    RETURN QUERY
    SELECT 
      user_record.id as user_id,
      (SELECT store_name FROM public.stores WHERE id = user_record.store_id) as store_name,
      user_record.username,
      user_record.pin,
      user_record.role,
      user_record.subscription_date,
      user_record.subscription_expiry,
      now() as last_login,
      user_record.store_id,
      store_resolution.current_slug,
      store_resolution.needs_redirect,
      TRUE as store_active
    ;
  END IF;
  
  RETURN;
END;
$$;