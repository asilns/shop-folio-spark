-- Create a simple test to verify pgcrypto works
SELECT public.crypt('test', public.gen_salt('bf')) as test_crypt;