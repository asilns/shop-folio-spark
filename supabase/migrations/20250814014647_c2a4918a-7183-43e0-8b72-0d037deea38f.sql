-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1003;

-- Update the trigger function to use the full function name
CREATE OR REPLACE FUNCTION public.set_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Only set order number if it's NULL or empty
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number = public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$function$;