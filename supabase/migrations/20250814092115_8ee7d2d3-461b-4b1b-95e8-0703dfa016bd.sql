-- Drop and recreate the authentication function with correct types
DROP FUNCTION IF EXISTS public.authenticate_admin(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.authenticate_admin(input_username TEXT, input_password TEXT)
RETURNS TABLE(
  admin_id UUID,
  username VARCHAR(50),
  role VARCHAR(20),
  email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- For default admin, use simple check
  IF input_username = 'admin' AND input_password = 'admin' THEN
    RETURN QUERY
    SELECT a.id, a.username, a.role, a.email
    FROM public.admins a
    WHERE a.username = 'admin';
  ELSE
    -- For other admins, you would implement proper password hashing here
    RETURN QUERY
    SELECT a.id, a.username, a.role, a.email
    FROM public.admins a
    WHERE a.username = input_username
    AND FALSE; -- No other admins can login yet until proper password hashing is implemented
  END IF;
END;
$$;