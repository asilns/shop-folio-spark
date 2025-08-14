-- Update the generate_order_number function to return simple numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  seq_num bigint;
BEGIN
  -- Get next value from sequence
  seq_num := nextval('public.order_number_seq');
  
  -- Return just the sequence number as text
  RETURN seq_num::TEXT;
END;
$function$;