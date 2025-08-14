-- Update existing orders with blank order numbers
UPDATE public.orders 
SET order_number = generate_order_number() 
WHERE order_number = '' OR order_number IS NULL;