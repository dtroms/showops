begin;

alter table public.shows enable row level security;

drop policy if exists shows_select_phase1 on public.shows;
drop policy if exists shows_insert_phase1 on public.shows;
drop policy if exists shows_update_phase1 on public.shows;
drop policy if exists shows_delete_phase1 on public.shows;

drop policy if exists shows_select_policy on public.shows;
drop policy if exists shows_insert_policy on public.shows;
drop policy if exists shows_update_policy on public.shows;
drop policy if exists shows_delete_policy on public.shows;

drop policy if exists shows_select on public.shows;
drop policy if exists shows_insert on public.shows;
drop policy if exists shows_update on public.shows;
drop policy if exists shows_delete on public.shows;

create policy shows_select_phase1
on public.shows
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = shows.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);

create policy shows_insert_phase1
on public.shows
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = created_by_membership_id
      and om.organization_id = shows.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  and (
    lead_membership_id is null
    or exists (
      select 1
      from public.organization_memberships om
      where om.id = lead_membership_id
        and om.organization_id = shows.organization_id
        and om.status = 'active'
    )
  )
);

create policy shows_update_phase1
on public.shows
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = shows.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = shows.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  and (
    lead_membership_id is null
    or exists (
      select 1
      from public.organization_memberships om
      where om.id = lead_membership_id
        and om.organization_id = shows.organization_id
        and om.status = 'active'
    )
  )
);

create policy shows_delete_phase1
on public.shows
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = shows.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager')
  )
);

commit;