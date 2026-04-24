begin;

-- =========================================================
-- SHOWOPS PHASE 2 USER INVITATIONS + MEMBERSHIP GOVERNANCE
-- ---------------------------------------------------------
-- Adds:
--   - organization_invitations
--   - helpers for invitation permissions
--   - RLS for invitations
--
-- Notes:
--   This supports leadership-driven user creation/invite flows.
--   Actual auth account creation can happen later through:
--     - Supabase invite/admin flow
--     - magic link signup
--     - custom invite acceptance page
-- =========================================================


-- =========================================================
-- 1) ORGANIZATION INVITATIONS
-- =========================================================

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
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
  reports_to_membership_id uuid references public.organization_memberships(id) on delete set null,
  invited_by_membership_id uuid references public.organization_memberships(id) on delete set null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  ),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email, status)
);

create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id);

create index if not exists organization_invitations_email_idx
  on public.organization_invitations (lower(email));

create index if not exists organization_invitations_status_idx
  on public.organization_invitations (organization_id, status);

create index if not exists organization_invitations_token_idx
  on public.organization_invitations (token);

drop trigger if exists trg_organization_invitations_updated_at
  on public.organization_invitations;

create trigger trg_organization_invitations_updated_at
before update on public.organization_invitations
for each row
execute function public.set_updated_at_generic();


-- =========================================================
-- 2) HELPER FUNCTIONS
-- =========================================================

create or replace function public.can_manage_invitations_in_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = org_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager')
  )
$$;

grant execute on function public.can_manage_invitations_in_org(uuid) to authenticated;


create or replace function public.can_assign_role_in_org(
  org_id uuid,
  target_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = org_id
      and om.status = 'active'
      and (
        (
          om.role in ('owner', 'org_admin')
          and target_role in (
            'owner',
            'org_admin',
            'ops_manager',
            'project_manager',
            'coordinator',
            'warehouse_admin',
            'crew'
          )
        )
        or (
          om.role = 'ops_manager'
          and target_role in (
            'project_manager',
            'coordinator',
            'warehouse_admin',
            'crew'
          )
        )
      )
  )
$$;

grant execute on function public.can_assign_role_in_org(uuid, text) to authenticated;


create or replace function public.validate_invitation_same_org()
returns trigger
language plpgsql
as $$
declare
  v_reports_to_org uuid;
  v_invited_by_org uuid;
begin
  if new.reports_to_membership_id is not null then
    select organization_id
    into v_reports_to_org
    from public.organization_memberships
    where id = new.reports_to_membership_id;

    if v_reports_to_org is null then
      raise exception 'reports_to_membership_id not found';
    end if;

    if v_reports_to_org <> new.organization_id then
      raise exception 'reports_to_membership_id must belong to same organization';
    end if;
  end if;

  if new.invited_by_membership_id is not null then
    select organization_id
    into v_invited_by_org
    from public.organization_memberships
    where id = new.invited_by_membership_id;

    if v_invited_by_org is null then
      raise exception 'invited_by_membership_id not found';
    end if;

    if v_invited_by_org <> new.organization_id then
      raise exception 'invited_by_membership_id must belong to same organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_invitation_same_org
  on public.organization_invitations;

create trigger trg_validate_invitation_same_org
before insert or update on public.organization_invitations
for each row
execute function public.validate_invitation_same_org();


-- =========================================================
-- 3) ENABLE RLS
-- =========================================================

alter table public.organization_invitations enable row level security;


-- =========================================================
-- 4) POLICIES
-- =========================================================

drop policy if exists organization_invitations_select_phase2
  on public.organization_invitations;
drop policy if exists organization_invitations_insert_phase2
  on public.organization_invitations;
drop policy if exists organization_invitations_update_phase2
  on public.organization_invitations;
drop policy if exists organization_invitations_delete_phase2
  on public.organization_invitations;

create policy organization_invitations_select_phase2
on public.organization_invitations
for select
to authenticated
using (
  public.can_manage_invitations_in_org(organization_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy organization_invitations_insert_phase2
on public.organization_invitations
for insert
to authenticated
with check (
  (
    public.can_manage_invitations_in_org(organization_id)
    and public.can_assign_role_in_org(organization_id, role)
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy organization_invitations_update_phase2
on public.organization_invitations
for update
to authenticated
using (
  public.can_manage_invitations_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
    and public.can_assign_role_in_org(organization_id, role)
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy organization_invitations_delete_phase2
on public.organization_invitations
for delete
to authenticated
using (
  public.can_manage_invitations_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
);


commit;