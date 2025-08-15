-- Fix security issues by setting search_path for functions

-- Update generate_store_slug function
CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base slug: lowercase, trim, replace spaces/special chars with hyphens
  base_slug := lower(trim(store_name_input));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  
  -- Ensure it's not empty
  IF base_slug = '' THEN
    base_slug := 'store';
  END IF;
  
  -- Check for uniqueness and append counter if needed
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.stores WHERE store_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update resolve_store_by_slug function
CREATE OR REPLACE FUNCTION public.resolve_store_by_slug(slug_input TEXT)
RETURNS TABLE(
  store_id uuid,
  current_slug TEXT,
  needs_redirect BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  store_record RECORD;
BEGIN
  -- First try to find by current slug
  SELECT s.id, s.store_slug INTO store_record
  FROM public.stores s
  WHERE s.store_slug = slug_input;
  
  IF FOUND THEN
    RETURN QUERY SELECT store_record.id, store_record.store_slug, FALSE;
    RETURN;
  END IF;
  
  -- Try to find in history
  SELECT s.id, s.store_slug INTO store_record
  FROM public.stores s
  JOIN public.store_slug_history h ON s.id = h.store_id
  WHERE h.old_slug = slug_input;
  
  IF FOUND THEN
    RETURN QUERY SELECT store_record.id, store_record.store_slug, TRUE;
    RETURN;
  END IF;
  
  -- Not found
  RETURN;
END;
$$;

-- Update handle_store_slug_change function
CREATE OR REPLACE FUNCTION public.handle_store_slug_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If slug changed, store old slug in history
  IF OLD.store_slug IS DISTINCT FROM NEW.store_slug THEN
    INSERT INTO public.store_slug_history (store_id, old_slug)
    VALUES (NEW.id, OLD.store_slug)
    ON CONFLICT (store_id, old_slug) DO NOTHING;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Update create_store_for_user function
CREATE OR REPLACE FUNCTION public.create_store_for_user(
  p_store_name TEXT,
  p_user_id uuid
)
RETURNS TABLE(
  store_id uuid,
  store_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_store_id uuid;
  new_slug TEXT;
BEGIN
  -- Generate slug
  new_slug := public.generate_store_slug(p_store_name);
  
  -- Create store
  INSERT INTO public.stores (store_name, store_slug, owner_user_id)
  VALUES (p_store_name, new_slug, p_user_id)
  RETURNING id INTO new_store_id;
  
  -- Assign user to store
  UPDATE public.managed_users
  SET store_id = new_store_id
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT new_store_id, new_slug;
END;
$$;