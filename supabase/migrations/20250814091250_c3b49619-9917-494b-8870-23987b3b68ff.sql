-- Enable the pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create password verification function
CREATE OR REPLACE FUNCTION public.verify_password(input_username TEXT, input_password TEXT)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE username = input_username 
    AND password_hash = crypt(input_password, password_hash)
  );
$$;

-- Check if the default admin exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE username = 'admin') THEN
    INSERT INTO public.admins (username, password_hash, role, email)
    VALUES ('admin', crypt('admin', gen_salt('bf')), 'SUPER_ADMIN', 'admin@company.com');
  END IF;
END $$;