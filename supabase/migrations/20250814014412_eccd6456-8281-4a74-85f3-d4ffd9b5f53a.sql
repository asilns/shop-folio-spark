-- Update the order with empty order number
UPDATE public.orders 
SET order_number = generate_order_number() 
WHERE order_number = '' OR order_number IS NULL;

-- Make sure the trigger function works correctly by updating it
CREATE OR REPLACE FUNCTION public.set_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Only set order number if it's NULL or empty
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number = generate_order_number();
  END IF;
  RETURN NEW;
END;
$function$;