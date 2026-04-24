create table if not exists public.organization_budget_item_presets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  category_key text not null,
  item_label text not null,
  default_cost numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, category_key, item_label)
);

create index if not exists org_budget_item_presets_org_category_idx
  on public.organization_budget_item_presets (organization_id, category_key);

create or replace function public.set_org_budget_item_presets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_org_budget_item_presets_updated_at
on public.organization_budget_item_presets;

create trigger trg_org_budget_item_presets_updated_at
before update on public.organization_budget_item_presets
for each row
execute function public.set_org_budget_item_presets_updated_at();

alter table public.organization_budget_item_presets enable row level security;

drop policy if exists "org_budget_item_presets_select" on public.organization_budget_item_presets;
drop policy if exists "org_budget_item_presets_insert" on public.organization_budget_item_presets;
drop policy if exists "org_budget_item_presets_update" on public.organization_budget_item_presets;
drop policy if exists "org_budget_item_presets_delete" on public.organization_budget_item_presets;

create policy "org_budget_item_presets_select"
on public.organization_budget_item_presets
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = organization_budget_item_presets.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);

create policy "org_budget_item_presets_insert"
on public.organization_budget_item_presets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = organization_budget_item_presets.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
);

create policy "org_budget_item_presets_update"
on public.organization_budget_item_presets
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = organization_budget_item_presets.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = organization_budget_item_presets.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
);

create policy "org_budget_item_presets_delete"
on public.organization_budget_item_presets
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = organization_budget_item_presets.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
);