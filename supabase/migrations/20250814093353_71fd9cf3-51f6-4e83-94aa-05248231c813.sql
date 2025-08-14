-- Fix RLS policies for managed_users table to work with the new admin authentication
-- Since admin authentication no longer uses Supabase auth, we need to disable RLS for admin operations
-- or create a service-role based approach

-- First, let's create a function that can be called with service role to bypass RLS
CREATE OR REPLACE FUNCTION public.create_managed_user(
  p_store_name VARCHAR(255),
  p_username VARCHAR(100),
  p_password_hash TEXT,
  p_pin CHAR(4),
  p_subscription_date DATE,
  p_subscription_expiry DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO public.managed_users (
    store_name, username, password_hash, pin,
    subscription_date, subscription_expiry
  ) VALUES (
    p_store_name, p_username, p_password_hash, p_pin,
    p_subscription_date, p_subscription_expiry
  ) RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Create function for updating managed users
CREATE OR REPLACE FUNCTION public.update_managed_user(
  p_user_id UUID,
  p_store_name VARCHAR(255) DEFAULT NULL,
  p_username VARCHAR(100) DEFAULT NULL,
  p_password_hash TEXT DEFAULT NULL,
  p_pin CHAR(4) DEFAULT NULL,
  p_subscription_date DATE DEFAULT NULL,
  p_subscription_expiry DATE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.managed_users 
  SET 
    store_name = COALESCE(p_store_name, store_name),
    username = COALESCE(p_username, username),
    password_hash = COALESCE(p_password_hash, password_hash),
    pin = COALESCE(p_pin, pin),
    subscription_date = COALESCE(p_subscription_date, subscription_date),
    subscription_expiry = COALESCE(p_subscription_expiry, subscription_expiry),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Create function for deleting managed users (soft delete)
CREATE OR REPLACE FUNCTION public.delete_managed_user(
  p_user_id UUID,
  p_admin_username TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Use the existing soft_delete_user function
  PERFORM public.soft_delete_user(p_user_id, p_admin_username);
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;