-- Migrate all tables from UUID store_id to 8-digit CHAR(8) store_id
-- This fixes the mismatch between UUID and 8-digit store IDs

-- 1. First, let's add the 8-digit store_id columns to tables that need migration
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.order_statuses ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);
ALTER TABLE public.invoice_settings ADD COLUMN IF NOT EXISTS store_id_8digit CHAR(8);

-- 2. Backfill the 8-digit store_id from the stores table
UPDATE public.customers c
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE c.store_id = s.store_id;

UPDATE public.products p
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE p.store_id = s.store_id;

UPDATE public.orders o
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE o.store_id = s.store_id;

UPDATE public.order_items oi
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE oi.store_id = s.store_id;

UPDATE public.payments pay
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE pay.store_id = s.store_id;

UPDATE public.order_statuses os
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE os.store_id = s.store_id;

UPDATE public.app_settings aps
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE aps.store_id = s.store_id;

UPDATE public.invoice_settings invs
SET store_id_8digit = s.store_id_8digit
FROM public.stores s
WHERE invs.store_id = s.store_id;

-- 3. Set NOT NULL constraints after backfill
ALTER TABLE public.customers ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.order_statuses ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN store_id_8digit SET NOT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN store_id_8digit SET NOT NULL;

-- 4. Drop old store_id columns and rename the new ones
ALTER TABLE public.customers DROP COLUMN store_id;
ALTER TABLE public.customers RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.products DROP COLUMN store_id;
ALTER TABLE public.products RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.orders DROP COLUMN store_id;
ALTER TABLE public.orders RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.order_items DROP COLUMN store_id;
ALTER TABLE public.order_items RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.payments DROP COLUMN store_id;
ALTER TABLE public.payments RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.order_statuses DROP COLUMN store_id;
ALTER TABLE public.order_statuses RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.app_settings DROP COLUMN store_id;
ALTER TABLE public.app_settings RENAME COLUMN store_id_8digit TO store_id;

ALTER TABLE public.invoice_settings DROP COLUMN store_id;
ALTER TABLE public.invoice_settings RENAME COLUMN store_id_8digit TO store_id;

-- 5. Add foreign key constraints to the new 8-digit store_id columns
ALTER TABLE public.customers
ADD CONSTRAINT customers_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.products
ADD CONSTRAINT products_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.orders
ADD CONSTRAINT orders_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.payments
ADD CONSTRAINT payments_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.order_statuses
ADD CONSTRAINT order_statuses_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.app_settings
ADD CONSTRAINT app_settings_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

ALTER TABLE public.invoice_settings
ADD CONSTRAINT invoice_settings_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

-- 6. Create indexes for the new store_id columns
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_id ON public.payments(store_id);
CREATE INDEX IF NOT EXISTS idx_order_statuses_store_id ON public.order_statuses(store_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_store_id ON public.app_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_store_id ON public.invoice_settings(store_id);

-- 7. Add constraint to ensure store_id is 8 digits
ALTER TABLE public.stores
ADD CONSTRAINT stores_store_id_8digit_format CHECK (store_id_8digit ~ '^[0-9]{8}$');

-- 8. Create a function to get or initialize invoice settings
CREATE OR REPLACE FUNCTION public.get_or_init_invoice_settings(p_store_id text)
RETURNS public.invoice_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  result public.invoice_settings;
BEGIN
  -- Try to insert default settings if they don't exist
  INSERT INTO public.invoice_settings (store_id, currency, tax_rate)
  VALUES (p_store_id, 'USD', 0.0000)
  ON CONFLICT (store_id) DO NOTHING;

  -- Return the settings
  SELECT * INTO result 
  FROM public.invoice_settings 
  WHERE store_id = p_store_id;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_init_invoice_settings(text) TO anon, authenticated;