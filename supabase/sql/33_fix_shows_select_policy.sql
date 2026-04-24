drop policy if exists shows_select_phase2 on public.shows;
drop policy if exists shows_select on public.shows;

create policy shows_select
on public.shows
for select
to authenticated
using (
  can_view_show(id)
  or exists (
    select 1
    from public.organization_memberships om
    where om.id = shows.created_by_membership_id
      and om.user_id = auth.uid()
      and om.organization_id = shows.organization_id
      and om.status = 'active'
  )
  or exists (
    select 1
    from public.organization_memberships om
    where om.id = shows.lead_membership_id
      and om.user_id = auth.uid()
      and om.organization_id = shows.organization_id
      and om.status = 'active'
  )
  or my_platform_role() = any (array['platform_admin'::text, 'platform_support'::text])
);