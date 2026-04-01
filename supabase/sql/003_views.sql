create or replace view public.show_budget_summaries as
with line_totals as (
  select
    s.id as show_id,
    s.organization_id,
    sum(case when li.section_type = 'gear' then coalesce(li.subtotal, 0) else 0 end) as gear_total,
    sum(case when li.section_type = 'vendor' then coalesce(li.subtotal, 0) else 0 end) as vendor_total,
    sum(case when li.section_type = 'supply' then coalesce(li.subtotal, 0) else 0 end) as supply_total,
    sum(case when li.section_type = 'travel' then coalesce(li.subtotal, 0) else 0 end) as travel_total,
    sum(coalesce(li.subtotal, 0)) as total_estimated_cost
  from public.shows s
  left join public.show_budget_line_items li on li.show_id = s.id
  group by s.id, s.organization_id
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
  coalesce(lt.gear_total, 0)::numeric(12,2) as gear_total,
  coalesce(lt.vendor_total, 0)::numeric(12,2) as vendor_total,
  coalesce(lt.supply_total, 0)::numeric(12,2) as supply_total,
  coalesce(lt.travel_total, 0)::numeric(12,2) as travel_total,
  coalesce(lt.total_estimated_cost, 0)::numeric(12,2) as total_estimated_cost,
  (coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0))::numeric(12,2) as projected_profit,
  case
    when coalesce(s.estimated_revenue, 0) > 0
      then round(((coalesce(s.estimated_revenue, 0) - coalesce(lt.total_estimated_cost, 0)) / s.estimated_revenue) * 100, 2)
    else null
  end as margin_percent
from public.shows s
left join line_totals lt on lt.show_id = s.id
left join public.clients c on c.id = s.client_id
left join public.venues v on v.id = s.venue_id;

create or replace view public.platform_organization_stats as
select
  o.id as organization_id,
  o.name,
  o.slug,
  o.plan_type,
  o.subscription_status,
  o.trial_ends_at,
  o.billing_override_type,
  o.disabled_at,
  o.created_at,
  count(distinct p.id) as user_count,
  count(distinct s.id) as show_count,
  count(distinct vd.id) as vendor_count,
  count(distinct gi.id) as gear_item_count,
  count(distinct si.id) as supply_item_count
from public.organizations o
left join public.profiles p on p.organization_id = o.id
left join public.shows s on s.organization_id = o.id
left join public.vendors vd on vd.organization_id = o.id
left join public.gear_items gi on gi.organization_id = o.id
left join public.supply_items si on si.organization_id = o.id
group by
  o.id,
  o.name,
  o.slug,
  o.plan_type,
  o.subscription_status,
  o.trial_ends_at,
  o.billing_override_type,
  o.disabled_at,
  o.created_at;

create or replace view public.platform_billing_overview as
select
  o.id as organization_id,
  o.name,
  o.plan_type,
  o.subscription_status,
  o.trial_ends_at,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.billing_override_type,
  o.billing_override_reason,
  o.billing_override_expires_at,
  case
    when o.billing_override_type <> 'none'
      and (o.billing_override_expires_at is null or o.billing_override_expires_at > now())
      then 'override_active'
    when o.subscription_status = 'active'
      then 'paying'
    when o.subscription_status = 'trialing'
      then 'trial'
    when o.subscription_status in ('canceled', 'unpaid', 'past_due')
      then 'attention'
    else 'other'
  end as billing_state
from public.organizations o;