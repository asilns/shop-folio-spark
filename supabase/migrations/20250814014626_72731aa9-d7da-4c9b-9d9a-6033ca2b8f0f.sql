-- Recreate the generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Test the function by selecting the next value (without consuming it)
SELECT currval('public.order_number_seq') as current_sequence_value;