-- Remove state and postal_code columns from invoice_settings table
ALTER TABLE public.invoice_settings 
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS postal_code;