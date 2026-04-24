begin;

-- =========================================================
-- ORGANIZATIONS
-- =========================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- ORGANIZATION MEMBERSHIPS
-- =========================================================

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  role text not null check (
    role in (
      'owner',
      'org_admin',
      'ops_manager',
      'project_manager',
      'coordinator',
      'warehouse_admin',
      'crew'
    )
  ),

  status text not null default 'active' check (
    status in ('active', 'inactive')
  ),

  reports_to_membership_id uuid references public.organization_memberships(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, user_id)
);

create index if not exists org_memberships_user_idx
  on public.organization_memberships (user_id);

create index if not exists org_memberships_org_idx
  on public.organization_memberships (organization_id);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

create or replace function public.set_updated_at_generic()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orgs_updated_at on public.organizations;
create trigger trg_orgs_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at_generic();

drop trigger if exists trg_org_memberships_updated_at on public.organization_memberships;
create trigger trg_org_memberships_updated_at
before update on public.organization_memberships
for each row
execute function public.set_updated_at_generic();

commit;