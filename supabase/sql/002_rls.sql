alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.venues enable row level security;
alter table public.shows enable row level security;
alter table public.vendors enable row level security;
alter table public.show_vendors enable row level security;
alter table public.supply_items enable row level security;
alter table public.gear_categories enable row level security;
alter table public.gear_subcategories enable row level security;
alter table public.gear_items enable row level security;
alter table public.gear_item_rental_sources enable row level security;
alter table public.show_budget_line_items enable row level security;

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
$$;

grant execute on function public.current_user_organization_id() to authenticated;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
on public.organizations
for select
to authenticated
using (id = public.current_user_organization_id());

drop policy if exists profiles_select_own_org on public.profiles;
create policy profiles_select_own_org
on public.profiles
for select
to authenticated
using (organization_id = public.current_user_organization_id() or id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists clients_org_all on public.clients;
create policy clients_org_all
on public.clients
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists venues_org_all on public.venues;
create policy venues_org_all
on public.venues
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists shows_org_all on public.shows;
create policy shows_org_all
on public.shows
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists vendors_org_all on public.vendors;
create policy vendors_org_all
on public.vendors
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists show_vendors_org_all on public.show_vendors;
create policy show_vendors_org_all
on public.show_vendors
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists supply_items_org_all on public.supply_items;
create policy supply_items_org_all
on public.supply_items
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists gear_categories_org_all on public.gear_categories;
create policy gear_categories_org_all
on public.gear_categories
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists gear_subcategories_org_all on public.gear_subcategories;
create policy gear_subcategories_org_all
on public.gear_subcategories
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists gear_items_org_all on public.gear_items;
create policy gear_items_org_all
on public.gear_items
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists gear_item_rental_sources_org_all on public.gear_item_rental_sources;
create policy gear_item_rental_sources_org_all
on public.gear_item_rental_sources
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());

drop policy if exists show_budget_line_items_org_all on public.show_budget_line_items;
create policy show_budget_line_items_org_all
on public.show_budget_line_items
for all
to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());