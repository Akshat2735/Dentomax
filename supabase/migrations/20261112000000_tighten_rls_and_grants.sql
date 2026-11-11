-- Tighten database access. Writes happen only through Edge Functions using the
-- service-role key (which bypasses RLS and grants), so the browser roles need
-- read access only, and only to what the UI actually uses.

-- 1) Admin helper (same pattern as is_active_user).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

-- 2) profiles: an active user sees only their own row; admins see everyone.
--    (Previously any active student could list every user's username and role.)
DROP POLICY IF EXISTS "active users can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "own profile or admin can select profiles" ON public.profiles;
CREATE POLICY "own profile or admin can select profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (id = (select auth.uid()) AND public.is_active_user())
  );

-- 3) documents: students only see documents that are fully active.
--    Rows being deleted or failed-to-delete are admin-only, as the earlier
--    migration comment intends but the old policy did not enforce.
DROP POLICY IF EXISTS "active users can select documents" ON public.documents;
DROP POLICY IF EXISTS "active users see active documents, admins see all" ON public.documents;
CREATE POLICY "active users see active documents, admins see all"
  ON public.documents FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_active_user() AND deletion_status = 'active')
  );

-- 4) Grants: anon gets nothing; signed-in users can only SELECT.
REVOKE ALL ON public.profiles, public.documents FROM anon;
REVOKE ALL ON public.profiles, public.documents FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 5) Hide the storage key from API clients. Signed URLs are issued by the
--    document-signed-url function, which reads storage_path with the service role.
GRANT SELECT (id, title, subject, tags, file_size, created_at, file_type, deletion_status)
  ON public.documents TO authenticated;
