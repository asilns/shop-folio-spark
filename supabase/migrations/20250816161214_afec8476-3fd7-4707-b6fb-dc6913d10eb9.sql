-- Update the authentication function to ensure pgcrypto is accessible
-- and fix search path issues
DROP FUNCTION IF EXISTS public.authenticate_store_user_with_store_v2(text, character varying, text);

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
  store_id_8digit text,
  current_slug text, 
  needs_redirect boolean, 
  store_active boolean, 
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  user_record public.store_users%ROWTYPE;
  store_resolution RECORD;
  store_slug_input text;
  store_name_input text;
  dummy_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; -- Dummy hash for timing attack prevention
  password_valid boolean := false;
BEGIN
  -- Trim and normalize inputs (case-insensitive for store lookup)
  store_name_input := trim(p_store_input);
  store_slug_input := lower(store_name_input);
  store_slug_input := regexp_replace(store_slug_input, '[^a-z0-9]+', '-', 'g');
  store_slug_input := regexp_replace(store_slug_input, '^-+|-+$', '', 'g');
  store_slug_input := regexp_replace(store_slug_input, '-+', '-', 'g');
  
  -- Resolve store by slug (case-insensitive) or by store name (case-insensitive)
  SELECT s.store_id as store_id, s.store_slug as current_slug, s.is_active, s.store_name, s.store_id_8digit,
         CASE WHEN s.store_slug = store_slug_input THEN FALSE ELSE TRUE END as needs_redirect
  INTO store_resolution
  FROM public.stores s
  WHERE lower(s.store_slug) = store_slug_input 
     OR lower(trim(s.store_name)) = lower(store_name_input);
  
  -- If not found by current slug/name, try slug history
  IF NOT FOUND THEN
    SELECT s.store_id as store_id, s.store_slug as current_slug, s.is_active, s.store_name, s.store_id_8digit, TRUE as needs_redirect
    INTO store_resolution
    FROM public.stores s
    JOIN public.store_slug_history h ON s.store_id = h.store_id
    WHERE lower(h.old_slug) = store_slug_input;
  END IF;
  
  -- If store not found at all, perform dummy crypt to prevent timing attacks
  IF NOT FOUND THEN
    PERFORM public.crypt(p_password, dummy_hash);
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
    -- Still perform dummy crypt to prevent timing attacks
    PERFORM public.crypt(p_password, dummy_hash);
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
      store_resolution.current_slug,
      store_resolution.needs_redirect,
      FALSE as store_active,
      'STORE_DEACTIVATED'::text as error_code
    ;
    RETURN;
  END IF;
  
  -- Find user by username within this store (trim username input)
  SELECT u.* INTO user_record 
  FROM public.store_users u
  WHERE lower(trim(u.username)) = lower(trim(p_username))
    AND u.store_id = store_resolution.store_id;
  
  -- Always perform password verification to prevent timing attacks
  -- Handle both bcrypt and plain text passwords (migration compatibility)
  IF FOUND THEN
    -- First try bcrypt verification
    IF user_record.password_hash LIKE '$2%' THEN
      -- This looks like a bcrypt hash
      password_valid := public.crypt(p_password, user_record.password_hash) = user_record.password_hash;
    ELSE
      -- This is likely plain text (legacy format)
      password_valid := user_record.password_hash = p_password;
      
      -- If password matches, upgrade to bcrypt hash
      IF password_valid THEN
        UPDATE public.store_users 
        SET password_hash = public.crypt(p_password, public.gen_salt('bf'))
        WHERE id = user_record.id;
      END IF;
    END IF;
  ELSE
    -- User not found - perform dummy crypt with predictable hash to prevent timing attacks
    PERFORM public.crypt(p_password, dummy_hash);
    password_valid := false;
  END IF;
  
  -- If user found and password is valid
  IF FOUND AND password_valid THEN
    -- Update last login
    UPDATE public.store_users 
    SET last_login = now() 
    WHERE public.store_users.id = user_record.id;
    
    -- Return user data with store resolution info
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
      store_resolution.current_slug,
      store_resolution.needs_redirect,
      TRUE as store_active,
      'SUCCESS'::text as error_code
    ;
  ELSE
    -- Invalid credentials - return error
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
      store_resolution.current_slug,
      store_resolution.needs_redirect,
      TRUE as store_active,
      'INVALID_CREDENTIALS'::text as error_code
    ;
  END IF;
  
  RETURN;
END;
$function$;