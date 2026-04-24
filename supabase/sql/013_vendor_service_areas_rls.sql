begin;

alter table public.vendor_service_areas enable row level security;

drop policy if exists "vendor_service_areas_select_same_org" on public.vendor_service_areas;
create policy "vendor_service_areas_select_same_org"
on public.vendor_service_areas
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = vendor_service_areas.organization_id
  )
);

drop policy if exists "vendor_service_areas_insert_same_org" on public.vendor_service_areas;
create policy "vendor_service_areas_insert_same_org"
on public.vendor_service_areas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.vendors v
      on v.id = vendor_service_areas.vendor_id
    where p.id = auth.uid()
      and p.organization_id = vendor_service_areas.organization_id
      and v.organization_id = vendor_service_areas.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

drop policy if exists "vendor_service_areas_update_same_org" on public.vendor_service_areas;
create policy "vendor_service_areas_update_same_org"
on public.vendor_service_areas
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = vendor_service_areas.organization_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.vendors v
      on v.id = vendor_service_areas.vendor_id
    where p.id = auth.uid()
      and p.organization_id = vendor_service_areas.organization_id
      and v.organization_id = vendor_service_areas.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

drop policy if exists "vendor_service_areas_delete_same_org" on public.vendor_service_areas;
create policy "vendor_service_areas_delete_same_org"
on public.vendor_service_areas
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = vendor_service_areas.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

commit;