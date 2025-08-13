-- Drop the existing trigger first
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;

-- Update the order number generation function to ensure uniqueness
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_order_number text;
  counter int := 1;
BEGIN
  LOOP
    -- Create order number with date, time (including microseconds), and counter
    new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LPAD(EXTRACT(MICROSECONDS FROM NOW())::TEXT, 6, '0') || '-' || LPAD(counter::TEXT, 3, '0');
    
    -- Check if this order number already exists
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = new_order_number) THEN
      RETURN new_order_number;
    END IF;
    
    -- If it exists, increment counter and try again
    counter := counter + 1;
  END LOOP;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();