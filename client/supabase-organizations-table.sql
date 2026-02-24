-- Run in Supabase SQL Editor. Creates organizations table for admin dropdown.
-- profiles.organization_id and jobs.organization_id reference this.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Authenticated users can read organizations (e.g. for dropdowns).
create policy "Authenticated can read organizations"
  on public.organizations for select
  to authenticated
  using (true);

-- Only service role or an admin policy can insert/update/delete (e.g. via API with service role).
-- Optionally: add policy so admins can manage organizations.
-- For now, use service role in API for admin create-user; orgs can be seeded in SQL.
