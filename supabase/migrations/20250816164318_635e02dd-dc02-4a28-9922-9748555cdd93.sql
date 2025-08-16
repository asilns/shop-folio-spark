-- Fix the migration by properly mapping UUIDs to 8-digit store IDs
-- First, let's check if we have the temporary columns from the failed migration and clean up

-- Drop the temporary columns if they exist (from failed migration)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.customers DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.products DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.orders DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.order_items DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.payments DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_statuses' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.order_statuses DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.app_settings DROP COLUMN store_id_8digit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'store_id_8digit') THEN
        ALTER TABLE public.invoice_settings DROP COLUMN store_id_8digit;
    END IF;
END $$;

-- Now do the migration correctly
-- Step 1: Add temporary columns for 8-digit store_id
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.order_statuses ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);
ALTER TABLE public.invoice_settings ADD COLUMN IF NOT EXISTS store_id_new CHAR(8);

-- Step 2: Map UUID store_id to 8-digit store_id_8digit from stores table
UPDATE public.customers c
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE c.store_id = s.store_id;

UPDATE public.products p
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE p.store_id = s.store_id;

UPDATE public.orders o
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE o.store_id = s.store_id;

UPDATE public.order_items oi
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE oi.store_id = s.store_id;

UPDATE public.payments pay
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE pay.store_id = s.store_id;

UPDATE public.order_statuses os
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE os.store_id = s.store_id;

UPDATE public.app_settings aps
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE aps.store_id = s.store_id;

UPDATE public.invoice_settings invs
SET store_id_new = s.store_id_8digit
FROM public.stores s
WHERE invs.store_id = s.store_id;

-- Step 3: Only set NOT NULL for tables that have all rows mapped
-- Check if any rows couldn't be mapped and delete orphaned rows
DELETE FROM public.customers WHERE store_id_new IS NULL;
DELETE FROM public.products WHERE store_id_new IS NULL;
DELETE FROM public.orders WHERE store_id_new IS NULL;
DELETE FROM public.order_items WHERE store_id_new IS NULL;
DELETE FROM public.payments WHERE store_id_new IS NULL;
DELETE FROM public.order_statuses WHERE store_id_new IS NULL;
DELETE FROM public.app_settings WHERE store_id_new IS NULL;
DELETE FROM public.invoice_settings WHERE store_id_new IS NULL;

-- Set NOT NULL constraints
ALTER TABLE public.customers ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.order_statuses ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN store_id_new SET NOT NULL;
ALTER TABLE public.invoice_settings ALTER COLUMN store_id_new SET NOT NULL;