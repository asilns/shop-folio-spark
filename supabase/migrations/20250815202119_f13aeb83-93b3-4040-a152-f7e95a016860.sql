-- Refactor for store-scoped user management with roles
-- Add role column to managed_users table

-- First, add the role column to existing managed_users table
ALTER TABLE public.managed_users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STORE_ADMIN' 
CHECK (role IN ('STORE_ADMIN', 'DATA_ENTRY', 'VIEWER'));

-- Update the constraint to ensure username is unique per store, not globally
-- First check if the constraint exists and drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'managed_users_username_key') THEN
        ALTER TABLE public.managed_users DROP CONSTRAINT managed_users_username_key;
    END IF;
END $$;

-- Add the new unique constraint for username per store
ALTER TABLE public.managed_users 
ADD CONSTRAINT unique_username_per_store UNIQUE (store_id, username);

-- Create function to prevent removal of last STORE_ADMIN from a store
CREATE OR REPLACE FUNCTION public.prevent_last_store_admin_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're deleting or updating a STORE_ADMIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'STORE_ADMIN') OR 
     (TG_OP = 'UPDATE' AND OLD.role = 'STORE_ADMIN' AND NEW.role != 'STORE_ADMIN') THEN
    
    -- Check if this is the last STORE_ADMIN for this store
    IF (SELECT COUNT(*) FROM public.managed_users 
        WHERE store_id = COALESCE(OLD.store_id, NEW.store_id) 
        AND role = 'STORE_ADMIN' 
        AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last STORE_ADMIN from a store';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the rule
DROP TRIGGER IF EXISTS prevent_last_store_admin_trigger ON public.managed_users;
CREATE TRIGGER prevent_last_store_admin_trigger
  BEFORE UPDATE OR DELETE ON public.managed_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_store_admin_removal();