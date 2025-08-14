-- Update existing order to use simple number format
UPDATE public.orders 
SET order_number = '1000' 
WHERE order_number = 'ORD-20250814-00001002';

-- Reset sequence to start from 1001 (so next order will be 1001)
SELECT setval('public.order_number_seq', 1000, true);