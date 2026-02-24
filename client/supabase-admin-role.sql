-- Run in Supabase SQL Editor: add role to profiles for admin access.
-- Then set one user as admin (e.g. your own profile) with:
--   update public.profiles set role = 'admin' where id = '<your-auth-user-uuid>';

alter table public.profiles
  add column if not exists role text not null default 'customer'
  check (role in ('admin', 'customer'));

-- Optional: allow admins to read all profiles (e.g. for user management).
-- create policy "Admins can read all profiles"
--   on public.profiles for select
--   using (
--     (select role from public.profiles where id = auth.uid()) = 'admin'
--   );
