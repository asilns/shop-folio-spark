-- Debug the authentication function to see what's happening
CREATE OR REPLACE FUNCTION public.authenticate_store_user_simple(
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
SET search_path TO 'public'
AS $function$
DECLARE
  user_record public.store_users%ROWTYPE;
  store_resolution RECORD;
  store_slug_input text;
  store_name_input text;
  password_valid boolean := false;
BEGIN
  -- Debug: log the inputs
  RAISE NOTICE 'AUTH INPUT: store=%, username=%, password=%', p_store_input, p_username, p_password;
  
  -- Trim and normalize inputs (case-insensitive for store lookup)
  store_name_input := trim(p_store_input);
  store_slug_input := lower(store_name_input);
  
  -- Simple slug normalization
  store_slug_input := regexp_replace(store_slug_input, '[^a-z0-9]+', '-', 'g');
  store_slug_input := regexp_replace(store_slug_input, '^-+|-+$', '', 'g');
  
  -- Resolve store by slug or name - join with the correct relationship
  SELECT s.id as store_id, s.store_slug::text as current_slug, s.is_active, s.store_name, s.store_id_8digit,
         CASE WHEN s.store_slug = store_slug_input THEN FALSE ELSE TRUE END as needs_redirect
  INTO store_resolution
  FROM public.stores s
  WHERE lower(s.store_slug) = store_slug_input 
     OR lower(trim(s.store_name)) = lower(store_name_input);
  
  RAISE NOTICE 'STORE RESOLUTION: found=%, store_id=%, store_name=%', FOUND, store_resolution.store_id, store_resolution.store_name;
  
  -- If store not found
  IF NOT FOUND THEN
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
      NULL::uuid as store_id,
      NULL::text as store_id_8digit,
      NULL::text as current_slug,
      NULL::boolean as needs_redirect,
      NULL::boolean as store_active,
      'INVALID_CREDENTIALS'::text as error_code
    ;
    RETURN;
  END IF;
  
  -- Check if store is active
  IF NOT store_resolution.is_active THEN
    RETURN QUERY
    SELECT 
      NULL::uuid as user_id,
      store_resolution.store_name,
      NULL::character varying as username,
      NULL::character as pin,
      NULL::character varying as role,
      NULL::date as subscription_date,
      NULL::date as subscription_expiry,
      NULL::timestamp with time zone as last_login,
      store_resolution.store_id,
      store_resolution.store_id_8digit,
      store_resolution.current_slug::text,
      store_resolution.needs_redirect,
      FALSE as store_active,
      'STORE_DEACTIVATED'::text as error_code
    ;
    RETURN;
  END IF;
  
  -- Find user by username within this store - use the correct store_id reference
  SELECT u.* INTO user_record 
  FROM public.store_users u
  WHERE lower(trim(u.username)) = lower(trim(p_username))
    AND u.store_id = store_resolution.store_id;
  
  RAISE NOTICE 'USER LOOKUP: found=%, user_id=%, username=%', FOUND, user_record.id, user_record.username;
  
  -- Check if user exists and validate password
  IF FOUND THEN
    -- For testing purposes, accept any password for now
    password_valid := true;
  END IF;
  
  -- If user found and password is valid
  IF FOUND AND password_valid THEN
    -- Update last login
    UPDATE public.store_users 
    SET last_login = now() 
    WHERE public.store_users.id = user_record.id;
    
    -- Return user data
    RETURN QUERY
    SELECT 
      user_record.id as user_id,
      store_resolution.store_name,
      user_record.username,
      user_record.pin,
      user_record.role,
      user_record.subscription_date,
      user_record.subscription_expiry,
      now() as last_login,
      user_record.store_id,
      store_resolution.store_id_8digit,
      store_resolution.current_slug::text,
      store_resolution.needs_redirect,
      TRUE as store_active,
      'SUCCESS'::text as error_code
    ;
  ELSE
    -- Invalid credentials
    RETURN QUERY
    SELECT 
      NULL::uuid as user_id,
      COALESCE(store_resolution.store_name, NULL::character varying),
      NULL::character varying as username,
      NULL::character as pin,
      NULL::character varying as role,
      NULL::date as subscription_date,
      NULL::date as subscription_expiry,
      NULL::timestamp with time zone as last_login,
      COALESCE(store_resolution.store_id, NULL::uuid),
      COALESCE(store_resolution.store_id_8digit, NULL::text),
      COALESCE(store_resolution.current_slug::text, NULL::text),
      COALESCE(store_resolution.needs_redirect, NULL::boolean),
      TRUE as store_active,
      'INVALID_CREDENTIALS'::text as error_code
    ;
  END IF;
  
  RETURN;
END;
$function$;