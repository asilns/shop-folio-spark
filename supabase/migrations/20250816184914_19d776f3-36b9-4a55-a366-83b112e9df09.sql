-- Add database constraints and safeguards for order_statuses isolation

-- Ensure order_statuses is store-scoped and unique within store
ALTER TABLE public.order_statuses
  ALTER COLUMN store_id SET NOT NULL;

-- Add foreign key constraint to stores table
ALTER TABLE public.order_statuses
  DROP CONSTRAINT IF EXISTS order_statuses_store_id_fkey;

ALTER TABLE public.order_statuses
  ADD CONSTRAINT order_statuses_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id_8digit) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_statuses_store_id
  ON public.order_statuses(store_id);

-- Per-store uniqueness for slug (prevents cross-store collisions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_statuses_store_slug_key'
  ) THEN
    ALTER TABLE public.order_statuses
      ADD CONSTRAINT order_statuses_store_slug_key UNIQUE (store_id, name);
  END IF;
END $$;

-- Function to forbid changing store_id after insert
CREATE OR REPLACE FUNCTION public.forbid_store_id_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.store_id <> OLD.store_id THEN
    RAISE EXCEPTION 'store_id is immutable and cannot be changed after creation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Trigger to prevent store_id changes
DROP TRIGGER IF EXISTS trg_order_statuses_store_immutable ON public.order_statuses;
CREATE TRIGGER trg_order_statuses_store_immutable
BEFORE UPDATE ON public.order_statuses
FOR EACH ROW EXECUTE FUNCTION public.forbid_store_id_change();