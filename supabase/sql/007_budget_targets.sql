begin;

create table if not exists public.organization_budget_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_key text not null,
  target_percent numeric(8,2) not null,
  warning_percent numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_budget_targets_category_key_check
    check (category_key in ('gear', 'w2_labor', 'freelance_labor', 'supply', 'travel')),
  constraint organization_budget_targets_target_percent_check
    check (target_percent >= 0),
  constraint organization_budget_targets_warning_percent_check
    check (warning_percent is null or warning_percent >= 0)
);

create unique index if not exists organization_budget_targets_org_category_uidx
  on public.organization_budget_targets (organization_id, category_key);

create or replace function public.set_updated_at_organization_budget_targets()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organization_budget_targets_updated_at
  on public.organization_budget_targets;

create trigger trg_organization_budget_targets_updated_at
before update on public.organization_budget_targets
for each row
execute function public.set_updated_at_organization_budget_targets();

insert into public.organization_budget_targets (
  organization_id,
  category_key,
  target_percent,
  warning_percent
)
select
  o.id,
  x.category_key,
  x.target_percent,
  x.warning_percent
from public.organizations o
cross join (
  values
    ('gear', 35.00, 40.00),
    ('w2_labor', 30.00, 35.00),
    ('freelance_labor', 18.00, 20.00),
    ('supply', 5.00, 7.50),
    ('travel', 15.00, 18.00)
) as x(category_key, target_percent, warning_percent)
on conflict (organization_id, category_key) do nothing;

commit;