-- The library supports embedded PDFs plus protected downloadable EPUB and ZIP files.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_type text NOT NULL DEFAULT 'pdf';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_file_type_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_file_type_check
      CHECK (file_type IN ('pdf', 'epub', 'zip'));
  END IF;
END $$;

COMMENT ON COLUMN public.documents.file_type IS
  'PDFs render in the protected viewer. EPUB and ZIP objects use protected short-lived downloads.';
