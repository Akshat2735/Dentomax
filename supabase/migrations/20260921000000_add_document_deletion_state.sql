-- A document is hidden before its R2 object is removed. Failed storage cleanup
-- remains visible only to administrators, where it can be retried safely.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deletion_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_deletion_status_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_deletion_status_check
      CHECK (deletion_status IN ('active', 'deleting', 'delete_failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS documents_deletion_status_idx
  ON public.documents (deletion_status);
