begin;

alter table public.freelancer_ratings enable row level security;

drop policy if exists "freelancer_ratings_select_same_org" on public.freelancer_ratings;
create policy "freelancer_ratings_select_same_org"
on public.freelancer_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = freelancer_ratings.organization_id
  )
);

drop policy if exists "freelancer_ratings_insert_same_org" on public.freelancer_ratings;
create policy "freelancer_ratings_insert_same_org"
on public.freelancer_ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.vendors v on v.id = freelancer_ratings.vendor_id
    join public.shows s on s.id = freelancer_ratings.show_id
    where p.id = auth.uid()
      and p.organization_id = freelancer_ratings.organization_id
      and v.organization_id = freelancer_ratings.organization_id
      and s.organization_id = freelancer_ratings.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

drop policy if exists "freelancer_ratings_update_same_org" on public.freelancer_ratings;
create policy "freelancer_ratings_update_same_org"
on public.freelancer_ratings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = freelancer_ratings.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.vendors v on v.id = freelancer_ratings.vendor_id
    join public.shows s on s.id = freelancer_ratings.show_id
    where p.id = auth.uid()
      and p.organization_id = freelancer_ratings.organization_id
      and v.organization_id = freelancer_ratings.organization_id
      and s.organization_id = freelancer_ratings.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

drop policy if exists "freelancer_ratings_delete_same_org" on public.freelancer_ratings;
create policy "freelancer_ratings_delete_same_org"
on public.freelancer_ratings
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = freelancer_ratings.organization_id
      and p.role in ('admin', 'editor', 'manager')
  )
);

commit;