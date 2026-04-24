begin;

-- =========================================================
-- SHOWOPS PHASE 2 ACCESS HELPERS + RLS
-- ---------------------------------------------------------
-- Purpose:
--   - move from profile-only access toward membership-based access
--   - preserve app compatibility while introducing Phase 2 rules
--   - keep org isolation hard
--
-- IMPORTANT:
--   This migration is intentionally compatible-first.
--   Server actions will still enforce finer-grained checks for:
--     - lifecycle state
--     - field-level permissions
--     - PM assigned-show edit restrictions
-- =========================================================


-- =========================================================
-- 1) HELPER FUNCTIONS
-- =========================================================

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select om.organization_id
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.status = 'active'
      order by om.created_at asc
      limit 1
    ),
    (
      select p.organization_id
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    )
  )
$$;

grant execute on function public.current_user_organization_id() to authenticated;


create or replace function public.current_user_membership_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.id
  from public.organization_memberships om
  where om.user_id = auth.uid()
    and om.status = 'active'
  order by om.created_at asc
  limit 1
$$;

grant execute on function public.current_user_membership_id() to authenticated;


create or replace function public.current_user_org_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select om.role
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.status = 'active'
      order by om.created_at asc
      limit 1
    ),
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    )
  )
$$;

grant execute on function public.current_user_org_role() to authenticated;


create or replace function public.my_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pu.platform_role
  from public.platform_users pu
  where pu.user_id = auth.uid()
    and pu.status = 'active'
  limit 1
$$;

grant execute on function public.my_platform_role() to authenticated;


create or replace function public.my_active_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.organization_id
  from public.organization_memberships om
  where om.user_id = auth.uid()
    and om.status = 'active'
$$;

grant execute on function public.my_active_org_ids() to authenticated;


create or replace function public.my_active_membership_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.id
  from public.organization_memberships om
  where om.user_id = auth.uid()
    and om.status = 'active'
$$;

grant execute on function public.my_active_membership_ids() to authenticated;


create or replace function public.is_org_member(org_id uuid)
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
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = org_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager')
  )
$$;

grant execute on function public.is_org_leadership(uuid) to authenticated;


create or replace function public.can_manage_users_in_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_leadership(org_id)
$$;

grant execute on function public.can_manage_users_in_org(uuid) to authenticated;


create or replace function public.can_view_all_shows_in_org(org_id uuid)
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
      and om.role in (
        'owner',
        'org_admin',
        'ops_manager',
        'project_manager',
        'warehouse_admin'
      )
  )
$$;

grant execute on function public.can_view_all_shows_in_org(uuid) to authenticated;


create or replace function public.has_show_membership(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.show_memberships sm
    join public.organization_memberships om
      on om.id = sm.membership_id
    where sm.show_id = show_uuid
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
$$;

grant execute on function public.has_show_membership(uuid) to authenticated;


create or replace function public.has_show_membership_role(show_uuid uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.show_memberships sm
    join public.organization_memberships om
      on om.id = sm.membership_id
    where sm.show_id = show_uuid
      and om.user_id = auth.uid()
      and om.status = 'active'
      and sm.show_role = any(allowed_roles)
  )
$$;

grant execute on function public.has_show_membership_role(uuid, text[]) to authenticated;


create or replace function public.can_view_show(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shows s
    where s.id = show_uuid
      and (
        public.can_view_all_shows_in_org(s.organization_id)
        or public.has_show_membership(s.id)
      )
  )
$$;

grant execute on function public.can_view_show(uuid) to authenticated;


create or replace function public.can_edit_show(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shows s
    where s.id = show_uuid
      and (
        public.is_org_leadership(s.organization_id)
        or (
          public.current_user_org_role() = 'project_manager'
          and public.is_org_member(s.organization_id)
        )
        or public.has_show_membership_role(s.id, array['lead', 'co_pm', 'coordinator', 'warehouse'])
      )
  )
$$;

grant execute on function public.can_edit_show(uuid) to authenticated;


create or replace function public.can_manage_budget_for_show(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shows s
    where s.id = show_uuid
      and (
        public.is_org_leadership(s.organization_id)
        or (
          public.current_user_org_role() = 'project_manager'
          and public.is_org_member(s.organization_id)
        )
        or public.has_show_membership_role(s.id, array['lead', 'co_pm', 'coordinator'])
      )
  )
$$;

grant execute on function public.can_manage_budget_for_show(uuid) to authenticated;


create or replace function public.can_manage_show_vendors(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shows s
    where s.id = show_uuid
      and (
        public.is_org_leadership(s.organization_id)
        or (
          public.current_user_org_role() = 'project_manager'
          and public.is_org_member(s.organization_id)
        )
        or public.has_show_membership_role(s.id, array['lead', 'co_pm', 'coordinator'])
      )
  )
$$;

grant execute on function public.can_manage_show_vendors(uuid) to authenticated;


create or replace function public.can_view_show_profitability(show_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shows s
    where s.id = show_uuid
      and (
        public.is_org_leadership(s.organization_id)
        or (
          public.current_user_org_role() = 'project_manager'
          and public.has_show_membership(s.id)
        )
      )
  )
$$;

grant execute on function public.can_view_show_profitability(uuid) to authenticated;


-- =========================================================
-- 2) ENABLE RLS ON budget_versions
-- =========================================================

alter table public.budget_versions enable row level security;


-- =========================================================
-- 3) ORGANIZATIONS
-- =========================================================

drop policy if exists organizations_select_own on public.organizations;

create policy organizations_select_phase2
on public.organizations
for select
to authenticated
using (
  public.is_org_member(id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

drop policy if exists organizations_update_phase2 on public.organizations;

create policy organizations_update_phase2
on public.organizations
for update
to authenticated
using (
  public.is_org_leadership(id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  public.is_org_leadership(id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 4) PROFILES
-- =========================================================

drop policy if exists profiles_select_own_org on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

create policy profiles_select_phase2
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (
    organization_id is not null
    and public.is_org_member(organization_id)
  )
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy profiles_update_phase2
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or (
    organization_id is not null
    and public.is_org_leadership(organization_id)
  )
  or public.my_platform_role() = 'platform_admin'
)
with check (
  id = auth.uid()
  or (
    organization_id is not null
    and public.is_org_leadership(organization_id)
  )
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 5) ORGANIZATION MEMBERSHIPS
-- =========================================================

drop policy if exists organization_memberships_select_self_or_same_org
  on public.organization_memberships;
drop policy if exists organization_memberships_insert_none
  on public.organization_memberships;
drop policy if exists organization_memberships_update_none
  on public.organization_memberships;
drop policy if exists organization_memberships_delete_none
  on public.organization_memberships;

create policy organization_memberships_select_phase2
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_org_member(organization_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy organization_memberships_insert_phase2
on public.organization_memberships
for insert
to authenticated
with check (
  public.can_manage_users_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
);

create policy organization_memberships_update_phase2
on public.organization_memberships
for update
to authenticated
using (
  public.can_manage_users_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  public.can_manage_users_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
);

create policy organization_memberships_delete_phase2
on public.organization_memberships
for delete
to authenticated
using (
  public.can_manage_users_in_org(organization_id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 6) SHOWS
-- =========================================================

drop policy if exists shows_org_all on public.shows;

create policy shows_select_phase2
on public.shows
for select
to authenticated
using (
  public.can_view_show(id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy shows_insert_phase2
on public.shows
for insert
to authenticated
with check (
  (
    public.is_org_member(organization_id)
    and public.current_user_org_role() in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy shows_update_phase2
on public.shows
for update
to authenticated
using (
  public.can_edit_show(id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy shows_delete_phase2
on public.shows
for delete
to authenticated
using (
  public.is_org_leadership(organization_id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 7) SHOW MEMBERSHIPS
-- =========================================================

drop policy if exists show_memberships_select_same_org
  on public.show_memberships;
drop policy if exists show_memberships_insert_none
  on public.show_memberships;
drop policy if exists show_memberships_update_none
  on public.show_memberships;
drop policy if exists show_memberships_delete_none
  on public.show_memberships;

create policy show_memberships_select_phase2
on public.show_memberships
for select
to authenticated
using (
  public.can_view_show(show_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy show_memberships_insert_phase2
on public.show_memberships
for insert
to authenticated
with check (
  (
    public.is_org_leadership(organization_id)
    or (
      public.current_user_org_role() = 'project_manager'
      and public.has_show_membership_role(show_id, array['lead', 'co_pm'])
      and show_role in ('coordinator', 'viewer')
    )
    or (
      public.current_user_org_role() = 'warehouse_admin'
      and show_role = 'crew'
    )
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_memberships_update_phase2
on public.show_memberships
for update
to authenticated
using (
  (
    public.is_org_leadership(organization_id)
    or (
      public.current_user_org_role() = 'project_manager'
      and public.has_show_membership_role(show_id, array['lead', 'co_pm'])
    )
    or (
      public.current_user_org_role() = 'warehouse_admin'
      and show_role = 'crew'
    )
  )
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_memberships_delete_phase2
on public.show_memberships
for delete
to authenticated
using (
  (
    public.is_org_leadership(organization_id)
    or (
      public.current_user_org_role() = 'project_manager'
      and public.has_show_membership_role(show_id, array['lead', 'co_pm'])
    )
    or (
      public.current_user_org_role() = 'warehouse_admin'
      and show_role = 'crew'
    )
  )
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 8) VENDORS
-- =========================================================

drop policy if exists vendors_org_all on public.vendors;

create policy vendors_select_phase2
on public.vendors
for select
to authenticated
using (
  public.is_org_member(organization_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy vendors_insert_phase2
on public.vendors
for insert
to authenticated
with check (
  (
    public.is_org_member(organization_id)
    and public.current_user_org_role() in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy vendors_update_phase2
on public.vendors
for update
to authenticated
using (
  (
    public.is_org_member(organization_id)
    and public.current_user_org_role() in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy vendors_delete_phase2
on public.vendors
for delete
to authenticated
using (
  (
    public.is_org_member(organization_id)
    and public.current_user_org_role() in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 9) SHOW VENDORS
-- =========================================================

drop policy if exists "show_vendors_select_same_org" on public.show_vendors;
drop policy if exists "show_vendors_insert_same_org" on public.show_vendors;
drop policy if exists "show_vendors_update_same_org" on public.show_vendors;
drop policy if exists "show_vendors_delete_same_org" on public.show_vendors;
drop policy if exists show_vendors_org_all on public.show_vendors;

create policy show_vendors_select_phase2
on public.show_vendors
for select
to authenticated
using (
  public.can_view_show(show_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy show_vendors_insert_phase2
on public.show_vendors
for insert
to authenticated
with check (
  (
    public.can_manage_show_vendors(show_id)
    and organization_id in (select * from public.my_active_org_ids())
    and exists (
      select 1
      from public.shows s
      where s.id = show_vendors.show_id
        and s.organization_id = show_vendors.organization_id
    )
    and (
      vendor_id is null
      or exists (
        select 1
        from public.vendors v
        where v.id = show_vendors.vendor_id
          and v.organization_id = show_vendors.organization_id
      )
    )
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_vendors_update_phase2
on public.show_vendors
for update
to authenticated
using (
  public.can_manage_show_vendors(show_id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
    and exists (
      select 1
      from public.shows s
      where s.id = show_vendors.show_id
        and s.organization_id = show_vendors.organization_id
    )
    and (
      vendor_id is null
      or exists (
        select 1
        from public.vendors v
        where v.id = show_vendors.vendor_id
          and v.organization_id = show_vendors.organization_id
      )
    )
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_vendors_delete_phase2
on public.show_vendors
for delete
to authenticated
using (
  public.can_manage_show_vendors(show_id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 10) BUDGET VERSIONS
-- =========================================================

create policy budget_versions_select_phase2
on public.budget_versions
for select
to authenticated
using (
  public.can_view_show(show_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy budget_versions_insert_phase2
on public.budget_versions
for insert
to authenticated
with check (
  (
    public.can_manage_budget_for_show(show_id)
    and organization_id in (select * from public.my_active_org_ids())
    and exists (
      select 1
      from public.shows s
      where s.id = budget_versions.show_id
        and s.organization_id = budget_versions.organization_id
    )
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy budget_versions_update_phase2
on public.budget_versions
for update
to authenticated
using (
  public.can_manage_budget_for_show(show_id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy budget_versions_delete_phase2
on public.budget_versions
for delete
to authenticated
using (
  public.can_manage_budget_for_show(show_id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 11) SHOW BUDGET LINE ITEMS
-- =========================================================

drop policy if exists show_budget_line_items_org_all on public.show_budget_line_items;

create policy show_budget_line_items_select_phase2
on public.show_budget_line_items
for select
to authenticated
using (
  public.can_view_show(show_id)
  or public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy show_budget_line_items_insert_phase2
on public.show_budget_line_items
for insert
to authenticated
with check (
  (
    public.can_manage_budget_for_show(show_id)
    and organization_id in (select * from public.my_active_org_ids())
    and exists (
      select 1
      from public.shows s
      where s.id = show_budget_line_items.show_id
        and s.organization_id = show_budget_line_items.organization_id
    )
    and (
      vendor_id is null
      or exists (
        select 1
        from public.vendors v
        where v.id = show_budget_line_items.vendor_id
          and v.organization_id = show_budget_line_items.organization_id
      )
    )
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_budget_line_items_update_phase2
on public.show_budget_line_items
for update
to authenticated
using (
  public.can_manage_budget_for_show(show_id)
  or public.my_platform_role() = 'platform_admin'
)
with check (
  (
    organization_id in (select * from public.my_active_org_ids())
  )
  or public.my_platform_role() = 'platform_admin'
);

create policy show_budget_line_items_delete_phase2
on public.show_budget_line_items
for delete
to authenticated
using (
  public.can_manage_budget_for_show(show_id)
  or public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 12) AUDIT LOGS
-- ---------------------------------------------------------
-- Leadership can see org-wide logs.
-- PMs can see logs tied to shows they can view.
-- Platform roles can see all.
--
-- Inserts remain blocked here. Logging should happen through
-- trusted server-side code or service-role context.
-- =========================================================

drop policy if exists audit_logs_select_none on public.audit_logs;
drop policy if exists audit_logs_insert_none on public.audit_logs;
drop policy if exists audit_logs_update_none on public.audit_logs;
drop policy if exists audit_logs_delete_none on public.audit_logs;

create policy audit_logs_select_phase2
on public.audit_logs
for select
to authenticated
using (
  public.my_platform_role() in ('platform_admin', 'platform_support')
  or (
    organization_id is not null
    and public.is_org_leadership(organization_id)
  )
  or (
    show_id is not null
    and public.can_view_show(show_id)
  )
);

create policy audit_logs_insert_none_phase2
on public.audit_logs
for insert
to authenticated
with check (false);

create policy audit_logs_update_none_phase2
on public.audit_logs
for update
to authenticated
using (false)
with check (false);

create policy audit_logs_delete_none_phase2
on public.audit_logs
for delete
to authenticated
using (false);


-- =========================================================
-- 13) PLATFORM USERS
-- =========================================================

drop policy if exists platform_users_select_none on public.platform_users;
drop policy if exists platform_users_insert_none on public.platform_users;
drop policy if exists platform_users_update_none on public.platform_users;
drop policy if exists platform_users_delete_none on public.platform_users;

create policy platform_users_select_phase2
on public.platform_users
for select
to authenticated
using (
  public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy platform_users_insert_phase2
on public.platform_users
for insert
to authenticated
with check (
  public.my_platform_role() = 'platform_admin'
);

create policy platform_users_update_phase2
on public.platform_users
for update
to authenticated
using (
  public.my_platform_role() = 'platform_admin'
)
with check (
  public.my_platform_role() = 'platform_admin'
);

create policy platform_users_delete_phase2
on public.platform_users
for delete
to authenticated
using (
  public.my_platform_role() = 'platform_admin'
);


-- =========================================================
-- 14) PLATFORM SUPPORT SESSIONS
-- =========================================================

drop policy if exists platform_support_sessions_select_none on public.platform_support_sessions;
drop policy if exists platform_support_sessions_insert_none on public.platform_support_sessions;
drop policy if exists platform_support_sessions_update_none on public.platform_support_sessions;
drop policy if exists platform_support_sessions_delete_none on public.platform_support_sessions;

create policy platform_support_sessions_select_phase2
on public.platform_support_sessions
for select
to authenticated
using (
  public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy platform_support_sessions_insert_phase2
on public.platform_support_sessions
for insert
to authenticated
with check (
  public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy platform_support_sessions_update_phase2
on public.platform_support_sessions
for update
to authenticated
using (
  public.my_platform_role() in ('platform_admin', 'platform_support')
)
with check (
  public.my_platform_role() in ('platform_admin', 'platform_support')
);

create policy platform_support_sessions_delete_phase2
on public.platform_support_sessions
for delete
to authenticated
using (
  public.my_platform_role() = 'platform_admin'
);


commit;