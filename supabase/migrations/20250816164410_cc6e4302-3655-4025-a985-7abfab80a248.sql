-- Fix syntax error and add constraint properly
DO $$
BEGIN
    -- Add constraint to ensure store_id is 8 digits if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'stores_store_id_8digit_format' 
                   AND table_name = 'stores') THEN
        ALTER TABLE public.stores
        ADD CONSTRAINT stores_store_id_8digit_format CHECK (store_id_8digit ~ '^[0-9]{8}$');
    END IF;
END $$;