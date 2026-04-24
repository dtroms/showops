begin;

-- =========================================================
-- 1) BUDGET VERSIONS
-- =========================================================

create table if not exists public.budget_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  version_type text not null,
  version_name text not null,
  is_current boolean not null default true,
  source_version_id uuid references public.budget_versions(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint budget_versions_version_type_check
    check (version_type in ('pre', 'post'))
);

create index if not exists budget_versions_org_idx
  on public.budget_versions (organization_id);

create index if not exists budget_versions_show_idx
  on public.budget_versions (show_id);

create index if not exists budget_versions_show_type_idx
  on public.budget_versions (show_id, version_type);

create unique index if not exists budget_versions_one_current_per_show_type_idx
  on public.budget_versions (show_id, version_type)
  where is_current = true and archived_at is null;


-- =========================================================
-- 2) EXTEND show_budget_line_items FOR W2 LABOR + VERSIONING
-- =========================================================

alter table public.show_budget_line_items
  add column if not exists version_id uuid references public.budget_versions(id) on delete cascade,
  add column if not exists days numeric(12,2),
  add column if not exists hours numeric(12,2),
  add column if not exists calculation_type text,
  add column if not exists source_type text,
  add column if not exists is_auto_generated boolean not null default false,
  add column if not exists parent_line_item_id uuid references public.show_budget_line_items(id) on delete set null;

create index if not exists show_budget_line_items_version_idx
  on public.show_budget_line_items (version_id);

create index if not exists show_budget_line_items_parent_idx
  on public.show_budget_line_items (parent_line_item_id);

create index if not exists show_budget_line_items_show_version_section_idx
  on public.show_budget_line_items (show_id, version_id, section_type, subgroup_type);


-- =========================================================
-- 3) NORMALIZE DEFAULTS FOR NEW COLUMNS
-- =========================================================

update public.show_budget_line_items
set
  days = coalesce(days, 1),
  calculation_type = coalesce(calculation_type, 'quantity_x_unit_cost'),
  source_type = coalesce(source_type, 'manual')
where
  days is null
  or calculation_type is null
  or source_type is null;

alter table public.show_budget_line_items
  alter column days set default 1,
  alter column calculation_type set default 'quantity_x_unit_cost',
  alter column source_type set default 'manual';


-- =========================================================
-- 4) CREATE DEFAULT PRE-SHOW BUDGET VERSION FOR EVERY EXISTING SHOW
-- =========================================================

insert into public.budget_versions (
  organization_id,
  show_id,
  version_type,
  version_name,
  is_current,
  created_at,
  updated_at
)
select
  s.organization_id,
  s.id,
  'pre',
  'Pre-Show Budget',
  true,
  now(),
  now()
from public.shows s
where not exists (
  select 1
  from public.budget_versions bv
  where bv.show_id = s.id
    and bv.version_type = 'pre'
    and bv.archived_at is null
);

update public.show_budget_line_items li
set version_id = bv.id
from public.budget_versions bv
where li.show_id = bv.show_id
  and bv.version_type = 'pre'
  and bv.is_current = true
  and bv.archived_at is null
  and li.version_id is null;

alter table public.show_budget_line_items
  alter column version_id set not null;


-- =========================================================
-- 5) UPDATED-AT TRIGGER FOR budget_versions
-- =========================================================

create or replace function public.set_updated_at_budget_versions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_budget_versions_set_updated_at on public.budget_versions;

create trigger trg_budget_versions_set_updated_at
before update on public.budget_versions
for each row
execute function public.set_updated_at_budget_versions();


-- =========================================================
-- 6) HELPER: GET OR CREATE CURRENT BUDGET VERSION
-- =========================================================

create or replace function public.get_or_create_current_budget_version(
  target_show_id uuid,
  target_version_type text default 'pre'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
  v_org_id uuid;
  v_version_name text;
begin
  if target_version_type not in ('pre', 'post') then
    raise exception 'Invalid budget version type: %', target_version_type;
  end if;

  select organization_id
  into v_org_id
  from public.shows
  where id = target_show_id;

  if v_org_id is null then
    raise exception 'Show not found for id %', target_show_id;
  end if;

  select id
  into v_version_id
  from public.budget_versions
  where show_id = target_show_id
    and version_type = target_version_type
    and is_current = true
    and archived_at is null
  limit 1;

  if v_version_id is not null then
    return v_version_id;
  end if;

  v_version_name := case
    when target_version_type = 'pre' then 'Pre-Show Budget'
    else 'Post-Show Budget'
  end;

  insert into public.budget_versions (
    organization_id,
    show_id,
    version_type,
    version_name,
    is_current
  )
  values (
    v_org_id,
    target_show_id,
    target_version_type,
    v_version_name,
    true
  )
  returning id into v_version_id;

  return v_version_id;
end;
$$;

grant execute on function public.get_or_create_current_budget_version(uuid, text) to authenticated;


-- =========================================================
-- 7) HELPER: CALCULATE SUBTOTALS
-- =========================================================

create or replace function public.calculate_budget_line_subtotal(
  p_quantity numeric,
  p_days numeric,
  p_hours numeric,
  p_unit_cost numeric,
  p_calculation_type text,
  p_overtime_enabled boolean,
  p_overtime_hours numeric,
  p_overtime_rate numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_quantity numeric := coalesce(p_quantity, 0);
  v_days numeric := coalesce(p_days, 0);
  v_hours numeric := coalesce(p_hours, 0);
  v_unit_cost numeric := coalesce(p_unit_cost, 0);
  v_ot_hours numeric := coalesce(p_overtime_hours, 0);
  v_ot_rate numeric := coalesce(p_overtime_rate, 0);
  v_base numeric := 0;
begin
  case coalesce(p_calculation_type, 'quantity_x_unit_cost')
    when 'quantity_x_unit_cost' then
      v_base := v_quantity * v_unit_cost;

    when 'quantity_x_days_x_unit_cost' then
      v_base := v_quantity * v_days * v_unit_cost;

    when 'quantity_x_hours_x_unit_cost' then
      v_base := v_quantity * v_hours * v_unit_cost;

    when 'days_x_unit_cost' then
      v_base := v_days * v_unit_cost;

    when 'hours_x_unit_cost' then
      v_base := v_hours * v_unit_cost;

    when 'flat_amount' then
      v_base := v_unit_cost;

    when 'manual' then
      v_base := null;

    else
      v_base := v_quantity * v_unit_cost;
  end case;

  if p_calculation_type = 'manual' then
    return null;
  end if;

  if coalesce(p_overtime_enabled, false) then
    return coalesce(v_base, 0) + (v_ot_hours * v_ot_rate);
  end if;

  return coalesce(v_base, 0);
end;
$$;


-- =========================================================
-- 8) TRIGGER: AUTO-ASSIGN VERSION + AUTO-CALC SUBTOTAL/OT RATE
-- =========================================================

create or replace function public.apply_budget_line_defaults()
returns trigger
language plpgsql
as $$
begin
  -- Always guarantee version_id
  if new.version_id is null then
    new.version_id := public.get_or_create_current_budget_version(new.show_id, 'pre');
  end if;

  -- Normalize defaults
  new.days := coalesce(new.days, 1);
  new.calculation_type := coalesce(new.calculation_type, 'quantity_x_unit_cost');
  new.source_type := coalesce(new.source_type, 'manual');
  new.is_auto_generated := coalesce(new.is_auto_generated, false);

  -- Auto-calc OT rate for labor-ish sections if OT is enabled and rate missing
  if coalesce(new.overtime_enabled, false)
     and coalesce(new.overtime_rate, 0) = 0
     and coalesce(new.unit_cost, 0) > 0
     and new.section_type in ('vendor', 'w2_labor', 'freelance_labor') then
    new.overtime_rate := (new.unit_cost / 10) * 1.5;
  end if;

  -- Recalculate subtotal unless explicitly manual
  if new.calculation_type = 'manual' then
    new.subtotal := coalesce(new.subtotal, 0);
  else
    new.subtotal := coalesce(
      public.calculate_budget_line_subtotal(
        new.quantity,
        new.days,
        new.hours,
        new.unit_cost,
        new.calculation_type,
        new.overtime_enabled,
        new.overtime_hours,
        new.overtime_rate
      ),
      coalesce(new.subtotal, 0)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_budget_line_defaults on public.show_budget_line_items;

create trigger trg_apply_budget_line_defaults
before insert or update on public.show_budget_line_items
for each row
execute function public.apply_budget_line_defaults();


-- =========================================================
-- 9) BACKFILL EXISTING ROWS USING NEW CALC LOGIC
-- =========================================================

update public.show_budget_line_items
set
  subtotal = coalesce(
    public.calculate_budget_line_subtotal(
      quantity,
      days,
      hours,
      unit_cost,
      calculation_type,
      overtime_enabled,
      overtime_hours,
      case
        when coalesce(overtime_enabled, false)
             and coalesce(overtime_rate, 0) = 0
             and section_type in ('vendor', 'w2_labor', 'freelance_labor')
          then (unit_cost / 10) * 1.5
        else overtime_rate
      end
    ),
    subtotal
  ),
  overtime_rate = case
    when coalesce(overtime_enabled, false)
         and coalesce(overtime_rate, 0) = 0
         and section_type in ('vendor', 'w2_labor', 'freelance_labor')
      then (unit_cost / 10) * 1.5
    else overtime_rate
  end;


-- =========================================================
-- 10) OPTIONAL FUTURE-FACING TABLE FOR LABOR DAY ENTRIES
-- =========================================================
-- This is included now so the later UI code can use it immediately.

create table if not exists public.show_vendor_day_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  show_vendor_id uuid not null references public.show_vendors(id) on delete cascade,
  budget_line_item_id uuid references public.show_budget_line_items(id) on delete set null,
  work_date date not null,
  day_fraction numeric(5,2) not null default 1,
  overtime_hours numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint show_vendor_day_entries_day_fraction_check
    check (day_fraction >= 0)
);

create index if not exists show_vendor_day_entries_org_idx
  on public.show_vendor_day_entries (organization_id);

create index if not exists show_vendor_day_entries_show_idx
  on public.show_vendor_day_entries (show_id);

create index if not exists show_vendor_day_entries_show_vendor_idx
  on public.show_vendor_day_entries (show_vendor_id);

create index if not exists show_vendor_day_entries_work_date_idx
  on public.show_vendor_day_entries (work_date);


-- =========================================================
-- 11) REPLACE VIEW: show_budget_summaries
--     - Uses CURRENT PRE-SHOW VERSION
--     - Supports W2 Labor + Freelance Labor
--     - Keeps vendor_total for backward compatibility
-- =========================================================

create or replace view public.show_budget_summaries as
with current_pre_versions as (
  select
    bv.show_id,
    bv.id as budget_version_id,
    bv.version_type
  from public.budget_versions bv
  where bv.version_type = 'pre'
    and bv.is_current = true
    and bv.archived_at is null
),
line_totals as (
  select
    s.id as show_id,
    s.organization_id,
    cpv.budget_version_id,
    cpv.version_type as budget_version_type,

    sum(
      case
        when li.section_type = 'gear' then coalesce(li.subtotal, 0)
        else 0
      end
    ) as gear_total,

    sum(
      case
        when li.section_type = 'w2_labor' then coalesce(li.subtotal, 0)
        else 0
      end
    ) as w2_labor_total,

    sum(
      case
        when li.section_type in ('freelance_labor', 'vendor') then coalesce(li.subtotal, 0)
        else 0
      end
    ) as freelance_labor_total,

    sum(
      case
        when li.section_type = 'supply' then coalesce(li.subtotal, 0)
        else 0
      end
    ) as supply_total,

    sum(
      case
        when li.section_type = 'travel' then coalesce(li.subtotal, 0)
        else 0
      end
    ) as travel_total,

    sum(coalesce(li.subtotal, 0)) as total_estimated_cost
  from public.shows s
  left join current_pre_versions cpv
    on cpv.show_id = s.id
  left join public.show_budget_line_items li
    on li.show_id = s.id
   and li.version_id = cpv.budget_version_id
  group by
    s.id,
    s.organization_id,
    cpv.budget_version_id,
    cpv.version_type
)
select
  s.id as show_id,
  s.organization_id,
  s.show_name,
  s.show_number,
  s.parent_project_name,
  c.name as client_name,
  v.name as venue_name,
  s.city,
  s.state,
  s.start_date,
  s.end_date,
  s.status,
  s.estimated_revenue,

  lt.budget_version_id,
  lt.budget_version_type,

  coalesce(lt.gear_total, 0)::numeric(12,2) as gear_total,
  coalesce(lt.w2_labor_total, 0)::numeric(12,2) as w2_labor_total,
  coalesce(lt.freelance_labor_total, 0)::numeric(12,2) as freelance_labor_total,

  -- Backward-compatibility alias for existing UI/code paths still expecting vendor_total
  coalesce(lt.freelance_labor_total, 0)::numeric(12,2) as vendor_total,

  coalesce(lt.supply_total, 0)::numeric(12,2) as supply_total,
  coalesce(lt.travel_total, 0)::numeric(12,2) as travel_total,
  coalesce(lt.total_estimated_cost, 0)::numeric(12,2) as total_estimated_cost,

  (coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0))::numeric(12,2) as projected_profit,

  case
    when coalesce(s.estimated_revenue, 0) > 0
      then round(
        (
          (coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0))
          / s.estimated_revenue
        ) * 100,
        2
      )
    else null
  end as margin_percent
from public.shows s
left join line_totals lt on lt.show_id = s.id
left join public.clients c on c.id = s.client_id
left join public.venues v on v.id = s.venue_id;


commit;