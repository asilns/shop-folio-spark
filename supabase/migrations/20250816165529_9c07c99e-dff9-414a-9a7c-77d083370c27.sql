-- Drop and recreate the _jwt_store_id function with correct return type
DROP FUNCTION IF EXISTS public._jwt_store_id();

CREATE OR REPLACE FUNCTION public._jwt_store_id()
RETURNS character(8)
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    CASE 
      WHEN current_setting('request.jwt.claims', true) = '' 
        OR current_setting('request.jwt.claims', true) IS NULL 
      THEN NULL::character(8)
      WHEN (current_setting('request.jwt.claims', true)::jsonb -> 'app' ->> 'store_id') = ''
        OR (current_setting('request.jwt.claims', true)::jsonb -> 'app' ->> 'store_id') IS NULL
      THEN NULL::character(8)
      ELSE (current_setting('request.jwt.claims', true)::jsonb -> 'app' ->> 'store_id')::character(8)
    END
$function$;

-- Update the validate_store_id function to check against the correct column
CREATE OR REPLACE FUNCTION public.validate_store_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if store_id is NULL
  IF NEW.store_id IS NULL THEN
    RAISE EXCEPTION 'store_id cannot be NULL for table %. Operation rejected. Use server API that injects store_id from session.', TG_TABLE_NAME;
  END IF;
  
  -- Check if store_id exists in stores table (check against store_id_8digit)
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE store_id_8digit = NEW.store_id) THEN
    RAISE EXCEPTION 'Invalid store_id (%) for table %. Store does not exist.', NEW.store_id, TG_TABLE_NAME;
  END IF;
  
  RETURN NEW;
END $function$;