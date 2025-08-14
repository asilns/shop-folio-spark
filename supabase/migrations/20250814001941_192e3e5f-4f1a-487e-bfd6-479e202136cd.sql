-- Add discount column to orders table
ALTER TABLE public.orders 
ADD COLUMN discount NUMERIC DEFAULT 0;

-- Add comment to the column for clarity
COMMENT ON COLUMN public.orders.discount IS 'Discount amount to be subtracted from total_amount';