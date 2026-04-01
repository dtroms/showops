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