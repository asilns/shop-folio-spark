-- Create a sequence for order numbers to ensure uniqueness
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

-- Update the order number generation function to use sequence
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  seq_num bigint;
BEGIN
  -- Get next value from sequence
  seq_num := nextval('public.order_number_seq');
  
  -- Create order number with date and sequence number
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 8, '0');
END;
$function$;