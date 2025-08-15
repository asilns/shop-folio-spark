-- Update database functions for store-scoped authentication and role management

-- Update the authenticate_store_user function to include role and store_id
CREATE OR REPLACE FUNCTION public.authenticate_store_user(p_username character varying, p_password text)
RETURNS TABLE(user_id uuid, store_name character varying, username character varying, pin character, role character varying, subscription_date date, subscription_expiry date, last_login timestamp with time zone, store_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_record public.managed_users%ROWTYPE;
BEGIN
  -- Find user by username
  SELECT u.* INTO user_record 
  FROM public.managed_users u
  WHERE u.username = p_username;
  
  -- If user not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Simple password check
  IF user_record.password_hash = p_password THEN
    -- Update last login
    UPDATE public.managed_users 
    SET last_login = now() 
    WHERE public.managed_users.id = user_record.id;
    
    -- Return user data including role and store_id
    RETURN QUERY
    SELECT 
      user_record.id as user_id,
      user_record.store_name,
      user_record.username,
      user_record.pin,
      user_record.role,
      user_record.subscription_date,
      user_record.subscription_expiry,
      now() as last_login,
      user_record.store_id
    ;
  END IF;
  
  RETURN;
END;
$function$;

-- Create function for store-aware authentication with store name/slug
CREATE OR REPLACE FUNCTION public.authenticate_store_user_with_store(p_store_input text, p_username character varying, p_password text)
RETURNS TABLE(user_id uuid, store_name character varying, username character varying, pin character, role character varying, subscription_date date, subscription_expiry date, last_login timestamp with time zone, store_id uuid, current_slug text, needs_redirect boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_record public.managed_users%ROWTYPE;
  store_resolution RECORD;
  store_slug_input text;
BEGIN
  -- Generate slug from store input (normalize)
  store_slug_input := lower(trim(p_store_input));
  store_slug_input := regexp_replace(store_slug_input, '[^a-z0-9]+', '-', 'g');
  store_slug_input := regexp_replace(store_slug_input, '^-+|-+$', '', 'g');
  store_slug_input := regexp_replace(store_slug_input, '-+', '-', 'g');
  
  -- Resolve store by slug
  SELECT s.id as store_id, s.store_slug as current_slug, 
         CASE WHEN s.store_slug = store_slug_input THEN FALSE ELSE TRUE END as needs_redirect
  INTO store_resolution
  FROM public.stores s
  WHERE s.store_slug = store_slug_input;
  
  -- If not found by current slug, try slug history
  IF NOT FOUND THEN
    SELECT s.id as store_id, s.store_slug as current_slug, TRUE as needs_redirect
    INTO store_resolution
    FROM public.stores s
    JOIN public.store_slug_history h ON s.id = h.store_id
    WHERE h.old_slug = store_slug_input;
  END IF;
  
  -- If store not found at all, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Find user by username within this store
  SELECT u.* INTO user_record 
  FROM public.managed_users u
  WHERE u.username = p_username 
    AND u.store_id = store_resolution.store_id;
  
  -- If user not found in this store, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check password
  IF user_record.password_hash = p_password THEN
    -- Update last login
    UPDATE public.managed_users 
    SET last_login = now() 
    WHERE public.managed_users.id = user_record.id;
    
    -- Return user data with store resolution info
    RETURN QUERY
    SELECT 
      user_record.id as user_id,
      user_record.store_name,
      user_record.username,
      user_record.pin,
      user_record.role,
      user_record.subscription_date,
      user_record.subscription_expiry,
      now() as last_login,
      user_record.store_id,
      store_resolution.current_slug,
      store_resolution.needs_redirect
    ;
  END IF;
  
  RETURN;
END;
$function$;