-- Remove the NOT NULL constraint from the email column in customers table
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;