begin;

-- =========================================================
-- SHOWOPS PHASE 2 ACCESS FOUNDATION
-- ---------------------------------------------------------
-- Adds:
--   - organization_memberships
--   - show_memberships
--   - platform_users
--   - platform_support_sessions
--   - audit_logs
--   - membership reference columns on existing tables
--   - backfill from existing profiles
--
-- IMPORTANT:
-- This migration is additive and compatible with the
-- current Phase 1 app.
--
-- It does NOT remove or replace:
--   - profiles.organization_id
--   - profiles.role
--
-- NOTE ABOUT EXISTING SHOWS:
-- Your current shows table does NOT contain a creator column,
-- so we cannot reliably backfill show creator / lead PM for
-- existing shows in this migration.
--
-- New shows will get proper membership assignment once we
-- update the show creation action in the next code step.
-- =========================================================


-- =========================================================
-- 1) UPDATED-AT HELPER
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


-- =========================================================
-- 2) ORGANIZATION MEMBERSHIPS
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
    status in ('invited', 'active', 'disabled')
  ),
  reports_to_membership_id uuid references public.organization_memberships(id) on delete set null,
  invited_by_membership_id uuid references public.organization_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_org_idx
  on public.organization_memberships (organization_id);

create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id);

create index if not exists organization_memberships_role_idx
  on public.organization_memberships (organization_id, role);

drop trigger if exists trg_organization_memberships_updated_at
  on public.organization_memberships;

create trigger trg_organization_memberships_updated_at
before update on public.organization_memberships
for each row
execute function public.set_updated_at_generic();


-- =========================================================
-- 3) SHOW MEMBERSHIPS
-- =========================================================

create table if not exists public.show_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  show_role text not null check (
    show_role in ('lead', 'co_pm', 'coordinator', 'warehouse', 'crew', 'viewer')
  ),
  assignment_type text not null check (
    assignment_type in ('auto_creator', 'manual_assignment', 'manager_assignment', 'warehouse_assignment')
  ),
  assigned_by_membership_id uuid references public.organization_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (show_id, membership_id, show_role)
);

create index if not exists show_memberships_org_idx
  on public.show_memberships (organization_id);

create index if not exists show_memberships_show_idx
  on public.show_memberships (show_id);

create index if not exists show_memberships_membership_idx
  on public.show_memberships (membership_id);

create index if not exists show_memberships_show_role_idx
  on public.show_memberships (show_id, show_role);


-- =========================================================
-- 4) PLATFORM USERS
-- =========================================================

create table if not exists public.platform_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform_role text not null check (
    platform_role in ('platform_admin', 'platform_support')
  ),
  status text not null default 'active' check (
    status in ('active', 'disabled')
  ),
  created_at timestamptz not null default now()
);


-- =========================================================
-- 5) PLATFORM SUPPORT SESSIONS
-- =========================================================

create table if not exists public.platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  mode text not null check (
    mode in ('view_as', 'act_as')
  ),
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (
    status in ('active', 'ended')
  )
);

create index if not exists platform_support_sessions_platform_user_idx
  on public.platform_support_sessions (platform_user_id);

create index if not exists platform_support_sessions_target_org_idx
  on public.platform_support_sessions (target_organization_id);

create index if not exists platform_support_sessions_target_user_idx
  on public.platform_support_sessions (target_user_id);


-- =========================================================
-- 6) AUDIT LOGS
-- =========================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_membership_id uuid references public.organization_memberships(id) on delete set null,
  actor_platform_role text check (
    actor_platform_role in ('platform_admin', 'platform_support')
  ),
  entity_type text not null,
  entity_id uuid not null,
  show_id uuid references public.shows(id) on delete cascade,
  action_type text not null,
  change_summary text not null,
  before_json jsonb,
  after_json jsonb,
  metadata_json jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

create index if not exists audit_logs_show_created_idx
  on public.audit_logs (show_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_actor_user_idx
  on public.audit_logs (actor_user_id);


-- =========================================================
-- 7) EXTEND EXISTING TABLES
-- =========================================================

alter table public.shows
  add column if not exists created_by_membership_id uuid references public.organization_memberships(id) on delete set null,
  add column if not exists lead_membership_id uuid references public.organization_memberships(id) on delete set null;

create index if not exists shows_created_by_membership_idx
  on public.shows (created_by_membership_id);

create index if not exists shows_lead_membership_idx
  on public.shows (lead_membership_id);

alter table public.show_vendors
  add column if not exists assigned_by_membership_id uuid references public.organization_memberships(id) on delete set null;

create index if not exists show_vendors_assigned_by_membership_idx
  on public.show_vendors (assigned_by_membership_id);

alter table public.show_budget_line_items
  add column if not exists created_by_membership_id uuid references public.organization_memberships(id) on delete set null,
  add column if not exists updated_by_membership_id uuid references public.organization_memberships(id) on delete set null;

create index if not exists show_budget_line_items_created_by_membership_idx
  on public.show_budget_line_items (created_by_membership_id);

create index if not exists show_budget_line_items_updated_by_membership_idx
  on public.show_budget_line_items (updated_by_membership_id);

alter table public.budget_versions
  add column if not exists created_by_membership_id uuid references public.organization_memberships(id) on delete set null;

create index if not exists budget_versions_created_by_membership_idx
  on public.budget_versions (created_by_membership_id);


-- =========================================================
-- 8) SAME-ORG VALIDATION HELPERS
-- =========================================================

create or replace function public.validate_same_org_show_membership()
returns trigger
language plpgsql
as $$
declare
  v_show_org uuid;
  v_membership_org uuid;
  v_assigned_by_org uuid;
begin
  select organization_id
  into v_show_org
  from public.shows
  where id = new.show_id;

  if v_show_org is null then
    raise exception 'Show not found for show_memberships.show_id %', new.show_id;
  end if;

  select organization_id
  into v_membership_org
  from public.organization_memberships
  where id = new.membership_id;

  if v_membership_org is null then
    raise exception 'Membership not found for show_memberships.membership_id %', new.membership_id;
  end if;

  if new.organization_id <> v_show_org then
    raise exception 'show_memberships.organization_id must match shows.organization_id';
  end if;

  if new.organization_id <> v_membership_org then
    raise exception 'show_memberships.organization_id must match organization_memberships.organization_id';
  end if;

  if new.assigned_by_membership_id is not null then
    select organization_id
    into v_assigned_by_org
    from public.organization_memberships
    where id = new.assigned_by_membership_id;

    if v_assigned_by_org is null then
      raise exception 'Assigned-by membership not found for show_memberships.assigned_by_membership_id %', new.assigned_by_membership_id;
    end if;

    if v_assigned_by_org <> new.organization_id then
      raise exception 'assigned_by_membership_id must belong to the same organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_same_org_show_membership
  on public.show_memberships;

create trigger trg_validate_same_org_show_membership
before insert or update on public.show_memberships
for each row
execute function public.validate_same_org_show_membership();


create or replace function public.validate_same_org_membership_reference()
returns trigger
language plpgsql
as $$
declare
  v_created_org uuid;
  v_lead_org uuid;
  v_assigned_org uuid;
begin
  if tg_table_name = 'shows' then
    if new.created_by_membership_id is not null then
      select organization_id
      into v_created_org
      from public.organization_memberships
      where id = new.created_by_membership_id;

      if v_created_org is null then
        raise exception 'created_by_membership_id not found on shows';
      end if;

      if v_created_org <> new.organization_id then
        raise exception 'shows.created_by_membership_id must belong to same organization';
      end if;
    end if;

    if new.lead_membership_id is not null then
      select organization_id
      into v_lead_org
      from public.organization_memberships
      where id = new.lead_membership_id;

      if v_lead_org is null then
        raise exception 'lead_membership_id not found on shows';
      end if;

      if v_lead_org <> new.organization_id then
        raise exception 'shows.lead_membership_id must belong to same organization';
      end if;
    end if;
  elsif tg_table_name = 'show_vendors' then
    if new.assigned_by_membership_id is not null then
      select organization_id
      into v_assigned_org
      from public.organization_memberships
      where id = new.assigned_by_membership_id;

      if v_assigned_org is null then
        raise exception 'assigned_by_membership_id not found on show_vendors';
      end if;

      if v_assigned_org <> new.organization_id then
        raise exception 'show_vendors.assigned_by_membership_id must belong to same organization';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_shows_membership_reference
  on public.shows;

create trigger trg_validate_shows_membership_reference
before insert or update on public.shows
for each row
execute function public.validate_same_org_membership_reference();

drop trigger if exists trg_validate_show_vendors_membership_reference
  on public.show_vendors;

create trigger trg_validate_show_vendors_membership_reference
before insert or update on public.show_vendors
for each row
execute function public.validate_same_org_membership_reference();


create or replace function public.validate_same_org_budget_membership_reference()
returns trigger
language plpgsql
as $$
declare
  v_created_org uuid;
  v_updated_org uuid;
begin
  if new.created_by_membership_id is not null then
    select organization_id
    into v_created_org
    from public.organization_memberships
    where id = new.created_by_membership_id;

    if v_created_org is null then
      raise exception 'created_by_membership_id not found on show_budget_line_items';
    end if;

    if v_created_org <> new.organization_id then
      raise exception 'show_budget_line_items.created_by_membership_id must belong to same organization';
    end if;
  end if;

  if new.updated_by_membership_id is not null then
    select organization_id
    into v_updated_org
    from public.organization_memberships
    where id = new.updated_by_membership_id;

    if v_updated_org is null then
      raise exception 'updated_by_membership_id not found on show_budget_line_items';
    end if;

    if v_updated_org <> new.organization_id then
      raise exception 'show_budget_line_items.updated_by_membership_id must belong to same organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_show_budget_line_items_membership_reference
  on public.show_budget_line_items;

create trigger trg_validate_show_budget_line_items_membership_reference
before insert or update on public.show_budget_line_items
for each row
execute function public.validate_same_org_budget_membership_reference();


create or replace function public.validate_same_org_budget_version_membership_reference()
returns trigger
language plpgsql
as $$
declare
  v_created_org uuid;
begin
  if new.created_by_membership_id is not null then
    select organization_id
    into v_created_org
    from public.organization_memberships
    where id = new.created_by_membership_id;

    if v_created_org is null then
      raise exception 'created_by_membership_id not found on budget_versions';
    end if;

    if v_created_org <> new.organization_id then
      raise exception 'budget_versions.created_by_membership_id must belong to same organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_budget_versions_membership_reference
  on public.budget_versions;

create trigger trg_validate_budget_versions_membership_reference
before insert or update on public.budget_versions
for each row
execute function public.validate_same_org_budget_version_membership_reference();


-- =========================================================
-- 9) BACKFILL ORGANIZATION MEMBERSHIPS FROM PROFILES
-- ---------------------------------------------------------
-- Compatibility bridge:
--   profiles.role = 'admin' becomes owner for now
--   any unknown/legacy role defaults to project_manager
-- =========================================================

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  created_at,
  updated_at
)
select
  p.organization_id,
  p.id as user_id,
  case
    when p.role = 'owner' then 'owner'
    when p.role = 'org_admin' then 'org_admin'
    when p.role = 'ops_manager' then 'ops_manager'
    when p.role = 'project_manager' then 'project_manager'
    when p.role = 'coordinator' then 'coordinator'
    when p.role = 'warehouse_admin' then 'warehouse_admin'
    when p.role = 'crew' then 'crew'
    when p.role = 'admin' then 'owner'
    else 'project_manager'
  end as role,
  'active' as status,
  coalesce(p.created_at, now()),
  now()
from public.profiles p
where p.organization_id is not null
on conflict (organization_id, user_id) do nothing;


-- =========================================================
-- 10) BACKFILL SHOW MEMBERSHIP REFERENCES ON SHOWS
-- ---------------------------------------------------------
-- Existing shows do not have a creator column in the current
-- schema, so these fields remain null for historical rows.
-- They will be populated for new rows in the next code step.
-- =========================================================


-- =========================================================
-- 11) BACKFILL SHOW MEMBERSHIPS FROM SHOW CREATORS
-- ---------------------------------------------------------
-- Skipped for historical rows because the current shows table
-- does not store the creator.
-- =========================================================


-- =========================================================
-- 12) BACKFILL MEMBERSHIP REFERENCES ON EXISTING CHILD ROWS
-- =========================================================

update public.budget_versions bv
set created_by_membership_id = om.id
from public.organization_memberships om
where bv.created_by_membership_id is null
  and bv.created_by = om.user_id
  and bv.organization_id = om.organization_id;

update public.show_budget_line_items li
set updated_by_membership_id = li.created_by_membership_id
where li.updated_by_membership_id is null
  and li.created_by_membership_id is not null;


-- =========================================================
-- 13) ENABLE RLS ON NEW TABLES
-- =========================================================

alter table public.organization_memberships enable row level security;
alter table public.show_memberships enable row level security;
alter table public.platform_users enable row level security;
alter table public.platform_support_sessions enable row level security;
alter table public.audit_logs enable row level security;


-- =========================================================
-- 14) MINIMAL SAFE POLICIES FOR NEW TABLES
-- ---------------------------------------------------------
-- Conservative starter policies so nothing is accidentally
-- exposed before the Phase 2 helper/policy migration.
-- =========================================================

-- ORGANIZATION MEMBERSHIPS

drop policy if exists organization_memberships_select_self_or_same_org
  on public.organization_memberships;

create policy organization_memberships_select_self_or_same_org
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or organization_id in (
    select om.organization_id
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.status = 'active'
  )
);

drop policy if exists organization_memberships_insert_none
  on public.organization_memberships;

create policy organization_memberships_insert_none
on public.organization_memberships
for insert
to authenticated
with check (false);

drop policy if exists organization_memberships_update_none
  on public.organization_memberships;

create policy organization_memberships_update_none
on public.organization_memberships
for update
to authenticated
using (false)
with check (false);

drop policy if exists organization_memberships_delete_none
  on public.organization_memberships;

create policy organization_memberships_delete_none
on public.organization_memberships
for delete
to authenticated
using (false);


-- SHOW MEMBERSHIPS

drop policy if exists show_memberships_select_same_org
  on public.show_memberships;

create policy show_memberships_select_same_org
on public.show_memberships
for select
to authenticated
using (
  organization_id in (
    select om.organization_id
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.status = 'active'
  )
);

drop policy if exists show_memberships_insert_none
  on public.show_memberships;

create policy show_memberships_insert_none
on public.show_memberships
for insert
to authenticated
with check (false);

drop policy if exists show_memberships_update_none
  on public.show_memberships;

create policy show_memberships_update_none
on public.show_memberships
for update
to authenticated
using (false)
with check (false);

drop policy if exists show_memberships_delete_none
  on public.show_memberships;

create policy show_memberships_delete_none
on public.show_memberships
for delete
to authenticated
using (false);


-- PLATFORM USERS

drop policy if exists platform_users_select_none
  on public.platform_users;

create policy platform_users_select_none
on public.platform_users
for select
to authenticated
using (false);

drop policy if exists platform_users_insert_none
  on public.platform_users;

create policy platform_users_insert_none
on public.platform_users
for insert
to authenticated
with check (false);

drop policy if exists platform_users_update_none
  on public.platform_users;

create policy platform_users_update_none
on public.platform_users
for update
to authenticated
using (false)
with check (false);

drop policy if exists platform_users_delete_none
  on public.platform_users;

create policy platform_users_delete_none
on public.platform_users
for delete
to authenticated
using (false);


-- PLATFORM SUPPORT SESSIONS

drop policy if exists platform_support_sessions_select_none
  on public.platform_support_sessions;

create policy platform_support_sessions_select_none
on public.platform_support_sessions
for select
to authenticated
using (false);

drop policy if exists platform_support_sessions_insert_none
  on public.platform_support_sessions;

create policy platform_support_sessions_insert_none
on public.platform_support_sessions
for insert
to authenticated
with check (false);

drop policy if exists platform_support_sessions_update_none
  on public.platform_support_sessions;

create policy platform_support_sessions_update_none
on public.platform_support_sessions
for update
to authenticated
using (false)
with check (false);

drop policy if exists platform_support_sessions_delete_none
  on public.platform_support_sessions;

create policy platform_support_sessions_delete_none
on public.platform_support_sessions
for delete
to authenticated
using (false);


-- AUDIT LOGS

drop policy if exists audit_logs_select_none
  on public.audit_logs;

create policy audit_logs_select_none
on public.audit_logs
for select
to authenticated
using (false);

drop policy if exists audit_logs_insert_none
  on public.audit_logs;

create policy audit_logs_insert_none
on public.audit_logs
for insert
to authenticated
with check (false);

drop policy if exists audit_logs_update_none
  on public.audit_logs;

create policy audit_logs_update_none
on public.audit_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists audit_logs_delete_none
  on public.audit_logs;

create policy audit_logs_delete_none
on public.audit_logs
for delete
to authenticated
using (false);


commit;