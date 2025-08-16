-- Update triggers to work with character(8) store_id format
-- First, let's update the _jwt_store_id function to return the 8-digit format
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

-- Update the generic store_id trigger
CREATE OR REPLACE FUNCTION public.tg_set_store_id_generic()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only set store_id if it's NULL
  IF NEW.store_id IS NULL THEN
    -- Try to get from JWT (PostgREST path)
    NEW.store_id := public._jwt_store_id();
    
    -- If still NULL, give table-specific error message
    IF NEW.store_id IS NULL THEN
      IF TG_TABLE_NAME = 'products' THEN
        RAISE EXCEPTION 'store_id cannot be NULL when creating products. Use the server API (/api/products) which injects store_id from session. Attempted to create: %', 
          COALESCE(NEW.name, NEW.sku, 'unnamed product');
      ELSE
        RAISE EXCEPTION 'store_id cannot be NULL. Use server/API that injects store_id from session. Table: %', TG_TABLE_NAME;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END $function$;

-- Update the orders-specific trigger
CREATE OR REPLACE FUNCTION public.tg_set_store_id_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only set store_id if it's NULL
  IF NEW.store_id IS NULL THEN
    -- Special case: ORDERS can derive store_id from the selected customer
    IF NEW.customer_id IS NOT NULL THEN
      -- Try to inherit store_id from the customer
      SELECT store_id INTO NEW.store_id 
      FROM public.customers 
      WHERE id = NEW.customer_id;
      
      -- Log what we found for debugging
      IF NEW.store_id IS NOT NULL THEN
        RAISE NOTICE 'Order inherited store_id % from customer %', NEW.store_id, NEW.customer_id;
      END IF;
    END IF;
    
    -- If still NULL, try JWT (PostgREST path)
    IF NEW.store_id IS NULL THEN
      NEW.store_id := public._jwt_store_id();
    END IF;
    
    -- If still NULL here, we refuse the insert to keep tenancy intact
    IF NEW.store_id IS NULL THEN
      RAISE EXCEPTION 'store_id cannot be NULL for orders. Customer ID: %, JWT store_id: %. Use server/API that injects store_id from session.', 
        COALESCE(NEW.customer_id::text, 'NULL'), 
        COALESCE(public._jwt_store_id()::text, 'NULL');
    END IF;
  END IF;
  
  RETURN NEW;
END $function$;

-- Update the order_items trigger
CREATE OR REPLACE FUNCTION public.tg_set_store_id_order_items()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only set store_id if it's NULL
  IF NEW.store_id IS NULL THEN
    -- Order items inherit store_id from parent order
    IF NEW.order_id IS NOT NULL THEN
      SELECT store_id INTO NEW.store_id 
      FROM public.orders 
      WHERE id = NEW.order_id;
      
      -- Log what we found for debugging
      IF NEW.store_id IS NOT NULL THEN
        RAISE NOTICE 'Order item inherited store_id % from order %', NEW.store_id, NEW.order_id;
      END IF;
    END IF;
    
    -- If still NULL, try JWT (PostgREST path)
    IF NEW.store_id IS NULL THEN
      NEW.store_id := public._jwt_store_id();
    END IF;
    
    -- If we still don't have a store_id, that's a problem
    IF NEW.store_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine store_id for order_item. Order ID: %, JWT store_id: %. Parent order may not exist or lacks store_id.', 
        COALESCE(NEW.order_id::text, 'NULL'),
        COALESCE(public._jwt_store_id()::text, 'NULL');
    END IF;
  END IF;
  
  RETURN NEW;
END $function$;

-- Update the validate_store_id function
CREATE OR REPLACE FUNCTION public.validate_store_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if store_id is NULL
  IF NEW.store_id IS NULL THEN
    RAISE EXCEPTION 'store_id cannot be NULL for table %. Operation rejected. Use server API that injects store_id from session.', TG_TABLE_NAME;
  END IF;
  
  -- Check if store_id exists in stores table
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE store_id_8digit = NEW.store_id) THEN
    RAISE EXCEPTION 'Invalid store_id (%) for table %. Store does not exist.', NEW.store_id, TG_TABLE_NAME;
  END IF;
  
  RETURN NEW;
END $function$;