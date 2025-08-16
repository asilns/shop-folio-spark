-- Add proper constraints and indexes for store isolation

-- 1. Ensure all store-scoped tables have proper NOT NULL constraints and foreign keys

-- Products table
ALTER TABLE public.products
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_store_id_fkey,
  ADD CONSTRAINT products_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

-- Customers table
ALTER TABLE public.customers
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_store_id_fkey,
  ADD CONSTRAINT customers_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);

-- Orders table
ALTER TABLE public.orders
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_store_id_fkey,
  ADD CONSTRAINT orders_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

-- Order items table
ALTER TABLE public.order_items
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_store_id_fkey,
  ADD CONSTRAINT order_items_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);

-- Payments table
ALTER TABLE public.payments
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_store_id_fkey,
  ADD CONSTRAINT payments_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_store_id ON public.payments(store_id);

-- App settings table
ALTER TABLE public.app_settings
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_store_id_fkey,
  ADD CONSTRAINT app_settings_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_app_settings_store_id ON public.app_settings(store_id);

-- Invoice settings table
ALTER TABLE public.invoice_settings
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.invoice_settings
  DROP CONSTRAINT IF EXISTS invoice_settings_store_id_fkey,
  ADD CONSTRAINT invoice_settings_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_settings_store_id ON public.invoice_settings(store_id);

-- Order statuses table
ALTER TABLE public.order_statuses
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.order_statuses
  DROP CONSTRAINT IF EXISTS order_statuses_store_id_fkey,
  ADD CONSTRAINT order_statuses_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_statuses_store_id ON public.order_statuses(store_id);

-- 2. Create function to prevent store_id changes after insert
CREATE OR REPLACE FUNCTION forbid_store_id_change() 
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.store_id <> OLD.store_id THEN
    RAISE EXCEPTION 'store_id is immutable and cannot be changed after creation';
  END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

-- 3. Add triggers to prevent store_id changes
DROP TRIGGER IF EXISTS trg_products_store_immutable ON public.products;
CREATE TRIGGER trg_products_store_immutable
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_customers_store_immutable ON public.customers;
CREATE TRIGGER trg_customers_store_immutable
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_orders_store_immutable ON public.orders;
CREATE TRIGGER trg_orders_store_immutable
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_order_items_store_immutable ON public.order_items;
CREATE TRIGGER trg_order_items_store_immutable
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_payments_store_immutable ON public.payments;
CREATE TRIGGER trg_payments_store_immutable
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_app_settings_store_immutable ON public.app_settings;
CREATE TRIGGER trg_app_settings_store_immutable
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_invoice_settings_store_immutable ON public.invoice_settings;
CREATE TRIGGER trg_invoice_settings_store_immutable
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

DROP TRIGGER IF EXISTS trg_order_statuses_store_immutable ON public.order_statuses;
CREATE TRIGGER trg_order_statuses_store_immutable
BEFORE UPDATE ON public.order_statuses
FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change();

-- 4. Add unique constraints for per-store uniqueness where appropriate
DO $$
BEGIN
  -- Product names should be unique within a store
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_store_name_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_store_name_key UNIQUE (store_id, name);
  END IF;
  
  -- Order numbers should be unique within a store  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_store_number_key'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_store_number_key UNIQUE (store_id, order_number);
  END IF;
  
  -- Order status names should be unique within a store
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_statuses_store_name_key'
  ) THEN
    ALTER TABLE public.order_statuses ADD CONSTRAINT order_statuses_store_name_key UNIQUE (store_id, name);
  END IF;
  
  -- App setting keys should be unique within a store
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_store_key_key'
  ) THEN
    ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_store_key_key UNIQUE (store_id, key);
  END IF;
END $$;