-- READ-ONLY security audit. Paste into Supabase Dashboard > SQL Editor and run each block.
-- Nothing here changes data. Send the results back so policies can be written to match.

-- 1) Is RLS enabled on every public table? (rowsecurity must be true for all)
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) Every existing policy (who can read/write what)
select tablename, policyname, cmd, roles, qual as using_clause, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd;

-- 3) Table privileges granted to the public API roles.
--    anon should have little or no access to profiles/documents.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 4) Storage buckets (should not be public if they hold protected books)
select id, name, public from storage.buckets;

-- 5) Active admins
select id, username, role, status from public.profiles where role = 'admin';
