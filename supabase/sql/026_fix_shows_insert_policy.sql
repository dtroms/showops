begin;

alter table public.shows enable row level security;

drop policy if exists shows_insert_phase1 on public.shows;
drop policy if exists shows_insert_policy on public.shows;
drop policy if exists shows_insert on public.shows;

create policy shows_insert_phase1
on public.shows
for insert
to authenticated
with check (
  organization_id in (select * from public.my_active_org_ids())
  and created_by_membership_id in (
    select om.id
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = shows.organization_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin', 'ops_manager', 'project_manager')
  )
  and (
    lead_membership_id is null
    or lead_membership_id in (
      select om.id
      from public.organization_memberships om
      where om.organization_id = shows.organization_id
        and om.status = 'active'
    )
  )
);
commit;