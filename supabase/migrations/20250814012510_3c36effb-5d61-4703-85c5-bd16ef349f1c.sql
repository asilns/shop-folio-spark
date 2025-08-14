-- Update the generate_order_number function to be more robust
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  seq_num bigint;
  date_str text;
BEGIN
  -- Get next value from sequence
  seq_num := nextval('public.order_number_seq');
  
  -- Create date string in YYYYMMDD format
  date_str := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Create order number with date and padded sequence number
  RETURN 'ORD-' || date_str || '-' || LPAD(seq_num::TEXT, 8, '0');
END;
$function$;