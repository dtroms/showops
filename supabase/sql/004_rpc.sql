create or replace function public.get_vendor_conflicts_for_show(
  target_show_id uuid,
  target_vendor_id uuid
)
returns table (
  conflicting_show_id uuid,
  conflicting_show_name text,
  conflicting_show_number text,
  start_date date,
  end_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with target_show as (
    select id, organization_id, start_date, end_date
    from public.shows
    where id = target_show_id
  )
  select
    s.id as conflicting_show_id,
    s.show_name as conflicting_show_name,
    s.show_number as conflicting_show_number,
    s.start_date,
    s.end_date,
    s.status
  from public.show_vendors sv
  join public.shows s on s.id = sv.show_id
  join target_show ts on ts.organization_id = s.organization_id
  where sv.vendor_id = target_vendor_id
    and sv.show_id <> target_show_id
    and s.start_date <= ts.end_date
    and s.end_date >= ts.start_date
  order by s.start_date asc
$$;

grant execute on function public.get_vendor_conflicts_for_show(uuid, uuid) to authenticated;


create or replace function public.organization_has_active_billing_access(
  target_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.disabled_at is not null then false
    when o.billing_override_type <> 'none'
      and (o.billing_override_expires_at is null or o.billing_override_expires_at > now())
      then true
    when o.subscription_status = 'active' then true
    when o.subscription_status = 'trialing'
      and (o.trial_ends_at is null or o.trial_ends_at > now())
      then true
    else false
  end
  from public.organizations o
  where o.id = target_org_id
$$;

grant execute on function public.organization_has_active_billing_access(uuid) to authenticated;


create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
$$;

grant execute on function public.is_platform_admin() to authenticated;