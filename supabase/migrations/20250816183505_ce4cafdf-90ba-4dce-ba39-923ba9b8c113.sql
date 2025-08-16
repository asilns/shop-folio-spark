-- Create store_settings table for per-store configuration
CREATE TABLE IF NOT EXISTS public.store_settings (
  store_id CHAR(8) PRIMARY KEY REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for store_settings
CREATE POLICY "svc all store_settings" 
ON public.store_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure order_statuses has proper store scoping with display_name
ALTER TABLE public.order_statuses 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing order_statuses to have display_name if missing
UPDATE public.order_statuses 
SET display_name = initcap(replace(name, '_', ' '))
WHERE display_name IS NULL;

-- Make display_name NOT NULL after updating
ALTER TABLE public.order_statuses 
ALTER COLUMN display_name SET NOT NULL;

-- Create function to get or initialize store settings
CREATE OR REPLACE FUNCTION public.get_or_init_store_settings(p_store_id CHAR(8))
RETURNS public.store_settings
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE 
  settings public.store_settings;
BEGIN
  -- Insert default settings if they don't exist
  INSERT INTO public.store_settings (store_id, language, default_currency)
  VALUES (p_store_id, 'en', 'USD')
  ON CONFLICT (store_id) DO NOTHING;
  
  -- Return the settings
  SELECT * INTO settings 
  FROM public.store_settings 
  WHERE store_id = p_store_id;
  
  RETURN settings;
END;
$$;

-- Create function to seed default order statuses for a store
CREATE OR REPLACE FUNCTION public.seed_default_order_statuses(p_store_id CHAR(8))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default order statuses if none exist for this store
  INSERT INTO public.order_statuses (store_id, name, display_name, color, sort_order, is_default, is_active)
  SELECT 
    p_store_id,
    x.name,
    x.display_name,
    x.color,
    x.sort_order,
    x.is_default,
    true
  FROM (
    VALUES
      ('pending', 'Pending', '#F59E0B', 10, true),
      ('processing', 'Processing', '#3B82F6', 20, false),
      ('shipped', 'Shipped', '#8B5CF6', 30, false),
      ('delivered', 'Delivered', '#10B981', 40, false),
      ('cancelled', 'Cancelled', '#EF4444', 50, false),
      ('returned', 'Returned', '#F97316', 60, false),
      ('on_hold', 'On Hold', '#6B7280', 70, false)
  ) AS x(name, display_name, color, sort_order, is_default)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.order_statuses os
    WHERE os.store_id = p_store_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_init_store_settings(CHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_default_order_statuses(CHAR) TO service_role;