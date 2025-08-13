-- Create function to reset the order sequence to a specific starting value
CREATE OR REPLACE FUNCTION public.reset_order_sequence(new_start bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Reset the sequence to the new starting value
  -- The sequence will start at new_start for the next order
  PERFORM setval('public.order_number_seq', new_start - 1, true);
END;
$function$;