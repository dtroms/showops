begin;

alter table public.show_vendors enable row level security;

drop policy if exists "show_vendors_select_same_org" on public.show_vendors;
drop policy if exists "show_vendors_insert_same_org" on public.show_vendors;
drop policy if exists "show_vendors_update_same_org" on public.show_vendors;
drop policy if exists "show_vendors_delete_same_org" on public.show_vendors;

create policy "show_vendors_select_same_org"
on public.show_vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.shows s
      on s.id = show_vendors.show_id
    where p.id = auth.uid()
      and p.organization_id = s.organization_id
  )
);

create policy "show_vendors_insert_same_org"
on public.show_vendors
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and exists (
        select 1
        from public.shows s
        where s.id = show_vendors.show_id
          and s.organization_id = p.organization_id
      )
      and exists (
        select 1
        from public.vendors v
        where v.id = show_vendors.vendor_id
          and v.organization_id = p.organization_id
      )
  )
);

create policy "show_vendors_update_same_org"
on public.show_vendors
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.shows s
      on s.id = show_vendors.show_id
    where p.id = auth.uid()
      and p.organization_id = s.organization_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and exists (
        select 1
        from public.shows s
        where s.id = show_vendors.show_id
          and s.organization_id = p.organization_id
      )
      and exists (
        select 1
        from public.vendors v
        where v.id = show_vendors.vendor_id
          and v.organization_id = p.organization_id
      )
  )
);

create policy "show_vendors_delete_same_org"
on public.show_vendors
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.shows s
      on s.id = show_vendors.show_id
    where p.id = auth.uid()
      and p.organization_id = s.organization_id
  )
);

commit;