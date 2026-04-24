begin;

-- =========================================================
-- CURRENT USER ORG IDS
-- =========================================================

create or replace function public.my_active_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_memberships
  where user_id = auth.uid()
    and status = 'active'
$$;

grant execute on function public.my_active_org_ids() to authenticated;


-- =========================================================
-- CURRENT USER ACTIVE MEMBERSHIP IDS
-- =========================================================

create or replace function public.my_active_membership_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.organization_memberships
  where user_id = auth.uid()
    and status = 'active'
$$;

grant execute on function public.my_active_membership_ids() to authenticated;


-- =========================================================
-- CURRENT USER ROLE IN ORG
-- =========================================================

create or replace function public.my_role_in_org(org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_memberships
  where user_id = auth.uid()
    and organization_id = org_id
    and status = 'active'
  limit 1
$$;

grant execute on function public.my_role_in_org(uuid) to authenticated;


-- =========================================================
-- CURRENT USER PRIMARY ORG ROLE
-- =========================================================

create or replace function public.current_user_org_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_memberships
  where user_id = auth.uid()
    and status = 'active'
  order by created_at asc
  limit 1
$$;

grant execute on function public.current_user_org_role() to authenticated;


-- =========================================================
-- CURRENT USER PRIMARY ORG ID
-- =========================================================

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_memberships
  where user_id = auth.uid()
    and status = 'active'
  order by created_at asc
  limit 1
$$;

grant execute on function public.current_user_organization_id() to authenticated;


-- =========================================================
-- PLATFORM ROLE
-- ---------------------------------------------------------
-- IMPORTANT:
-- Uses existing column name platform_role
-- =========================================================

create or replace function public.my_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select platform_role
  from public.platform_users
  where user_id = auth.uid()
    and status = 'active'
  limit 1
$$;

grant execute on function public.my_platform_role() to authenticated;


-- =========================================================
-- ORG MEMBERSHIP HELPERS
-- =========================================================

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships
    where user_id = auth.uid()
      and organization_id = org_id
      and status = 'active'
  )
$$;

grant execute on function public.is_org_member(uuid) to authenticated;


create or replace function public.is_org_leadership(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships
    where user_id = auth.uid()
      and organization_id = org_id
      and status = 'active'
      and role in ('owner', 'org_admin', 'ops_manager')
  )
$$;

grant execute on function public.is_org_leadership(uuid) to authenticated;


create or replace function public.is_leadership_role(role text)
returns boolean
language sql
stable
as $$
  select role in ('owner', 'org_admin', 'ops_manager')
$$;

grant execute on function public.is_leadership_role(text) to authenticated;

commit;