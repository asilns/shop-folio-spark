-- Complete the migration: finish renaming columns and add constraints
-- Step 4: Drop old store_id columns and rename the new ones
DO $$
BEGIN
    -- Handle existing foreign key constraints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'customers_store_id_fkey') THEN
        ALTER TABLE public.customers DROP CONSTRAINT customers_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_store_id_fkey') THEN
        ALTER TABLE public.products DROP CONSTRAINT products_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_store_id_fkey') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_store_id_fkey') THEN
        ALTER TABLE public.order_items DROP CONSTRAINT order_items_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_store_id_fkey') THEN
        ALTER TABLE public.payments DROP CONSTRAINT payments_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_statuses_store_id_fkey') THEN
        ALTER TABLE public.order_statuses DROP CONSTRAINT order_statuses_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'app_settings_store_id_fkey') THEN
        ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_store_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoice_settings_store_id_fkey') THEN
        ALTER TABLE public.invoice_settings DROP CONSTRAINT invoice_settings_store_id_fkey;
    END IF;
END $$;

-- Drop old columns and rename new ones
ALTER TABLE public.customers DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.customers RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.products DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.products RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.orders DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.orders RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.order_items DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.order_items RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.payments DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.payments RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.order_statuses DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.order_statuses RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.app_settings DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.app_settings RENAME COLUMN store_id_new TO store_id;

ALTER TABLE public.invoice_settings DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.invoice_settings RENAME COLUMN store_id_new TO store_id;

-- Add foreign key constraints to the new 8-digit store_id columns
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

-- Create indexes for the new store_id columns
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_id ON public.payments(store_id);
CREATE INDEX IF NOT EXISTS idx_order_statuses_store_id ON public.order_statuses(store_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_store_id ON public.app_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_store_id ON public.invoice_settings(store_id);

-- Add constraint to ensure store_id is 8 digits
ALTER TABLE public.stores
ADD CONSTRAINT IF NOT EXISTS stores_store_id_8digit_format CHECK (store_id_8digit ~ '^[0-9]{8}$');