-- Drop existing function first
DROP FUNCTION IF EXISTS public.create_managed_user(character varying, character varying, text, character, date, date);

-- Fix RLS policies for admins table to work with admin authentication system
-- Since admin auth no longer uses Supabase auth, we need service role policies

-- First, ensure RLS is enabled
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Add policies for service role operations (used by admin auth)
CREATE POLICY "Service role can manage admins" 
ON public.admins 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Update create_managed_user to return the created user data
CREATE OR REPLACE FUNCTION public.create_managed_user(
  p_store_name VARCHAR(255),
  p_username VARCHAR(100),
  p_password_hash TEXT,
  p_pin CHAR(4),
  p_subscription_date DATE,
  p_subscription_expiry DATE
)
RETURNS TABLE(
  id UUID,
  store_name VARCHAR(255),
  username VARCHAR(100),
  pin CHAR(4),
  subscription_date DATE,
  subscription_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE
)
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
  ) RETURNING public.managed_users.id INTO new_user_id;
  
  -- Return the created user data (without password hash)
  RETURN QUERY
  SELECT 
    u.id,
    u.store_name,
    u.username,
    u.pin,
    u.subscription_date,
    u.subscription_expiry,
    u.created_at
  FROM public.managed_users u
  WHERE u.id = new_user_id;
END;
$$;

-- Create function to authenticate store users
CREATE OR REPLACE FUNCTION public.authenticate_store_user(
  p_username VARCHAR(100),
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  store_name VARCHAR(255),
  username VARCHAR(100),
  pin CHAR(4),
  subscription_date DATE,
  subscription_expiry DATE,
  last_login TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_record public.managed_users%ROWTYPE;
BEGIN
  -- Get user record
  SELECT * INTO user_record 
  FROM public.managed_users 
  WHERE username = p_username;
  
  -- Check if user exists and password matches
  IF user_record.id IS NULL THEN
    RETURN; -- User not found
  END IF;
  
  -- Verify password using crypt
  IF NOT (user_record.password_hash = crypt(p_password, user_record.password_hash)) THEN
    RETURN; -- Password doesn't match
  END IF;
  
  -- Update last login
  UPDATE public.managed_users 
  SET last_login = now() 
  WHERE id = user_record.id;
  
  -- Return user data (without password hash)
  RETURN QUERY
  SELECT 
    user_record.id,
    user_record.store_name,
    user_record.username,
    user_record.pin,
    user_record.subscription_date,
    user_record.subscription_expiry,
    now() as last_login
  FROM public.managed_users 
  WHERE id = user_record.id;
END;
$$;