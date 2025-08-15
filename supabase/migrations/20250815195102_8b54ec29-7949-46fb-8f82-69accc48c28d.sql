-- Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name VARCHAR(100) UNIQUE NOT NULL,
  store_slug VARCHAR(120) UNIQUE NOT NULL,
  owner_user_id uuid REFERENCES public.managed_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store slug history for redirects
CREATE TABLE IF NOT EXISTS public.store_slug_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  old_slug VARCHAR(120) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, old_slug)
);

-- Add store_id to existing tables for data isolation
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.invoice_settings ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to managed_users
ALTER TABLE public.managed_users ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Enable RLS on new tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_slug_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for stores
CREATE POLICY "Users can view stores they belong to" ON public.stores 
FOR SELECT USING (
  id IN (
    SELECT store_id FROM public.managed_users WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage stores" ON public.stores 
FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for store_slug_history
CREATE POLICY "Users can view slug history for their stores" ON public.store_slug_history 
FOR SELECT USING (
  store_id IN (
    SELECT store_id FROM public.managed_users WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage slug history" ON public.store_slug_history 
FOR ALL USING (true) WITH CHECK (true);

-- Function to generate URL-safe slug
CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to resolve store by slug (current or historical)
CREATE OR REPLACE FUNCTION public.resolve_store_by_slug(slug_input TEXT)
RETURNS TABLE(
  store_id uuid,
  current_slug TEXT,
  needs_redirect BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to handle slug changes
CREATE OR REPLACE FUNCTION public.handle_store_slug_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger
DROP TRIGGER IF EXISTS store_slug_change_trigger ON public.stores;
CREATE TRIGGER store_slug_change_trigger
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_store_slug_change();

-- Function to create store and assign to user
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