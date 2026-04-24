drop view if exists public.show_budget_summaries;

create view public.show_budget_summaries as
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

    sum(case when li.section_type = 'gear' then coalesce(li.subtotal, 0) else 0 end) as gear_total,
    sum(case when li.section_type = 'w2_labor' then coalesce(li.subtotal, 0) else 0 end) as w2_labor_total,
    sum(case when li.section_type in ('freelance_labor', 'vendor') then coalesce(li.subtotal, 0) else 0 end) as freelance_labor_total,
    sum(case when li.section_type = 'supply' then coalesce(li.subtotal, 0) else 0 end) as supply_total,
    sum(case when li.section_type = 'travel' then coalesce(li.subtotal, 0) else 0 end) as travel_total,
    sum(case when li.section_type = 'shipping' then coalesce(li.subtotal, 0) else 0 end) as shipping_total,
    sum(case when li.section_type = 'expedited' then coalesce(li.subtotal, 0) else 0 end) as expedited_total,
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
  coalesce(lt.freelance_labor_total, 0)::numeric(12,2) as vendor_total,
  coalesce(lt.supply_total, 0)::numeric(12,2) as supply_total,
  coalesce(lt.travel_total, 0)::numeric(12,2) as travel_total,
  coalesce(lt.shipping_total, 0)::numeric(12,2) as shipping_total,
  coalesce(lt.expedited_total, 0)::numeric(12,2) as expedited_total,
  coalesce(lt.total_estimated_cost, 0)::numeric(12,2) as total_estimated_cost,

  (coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0))::numeric(12,2) as projected_profit,

  case
    when coalesce(s.estimated_revenue, 0) > 0
      then round((((coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0)) / s.estimated_revenue) * 100)::numeric, 2)
    else 0::numeric
  end as margin_percent
from public.shows s
left join public.clients c on c.id = s.client_id
left join public.venues v on v.id = s.venue_id
left join line_totals lt on lt.show_id = s.id;