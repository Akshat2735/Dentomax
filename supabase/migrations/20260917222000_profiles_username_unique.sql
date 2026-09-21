-- Usernames identify library accounts in the admin dashboard and must not be reused.
-- This also makes the admin-create-user rollback path testable and protects against
-- two accounts accidentally receiving the same username.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;
