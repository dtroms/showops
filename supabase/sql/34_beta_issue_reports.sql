create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reported_by_user_id uuid null references auth.users(id) on delete set null,
  reported_by_membership_id uuid null references public.organization_memberships(id) on delete set null,
  title text not null,
  description text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'new'
    check (status in ('new', 'acknowledged', 'fixed', 'closed')),
  route text not null,
  show_id uuid null references public.shows(id) on delete set null,
  browser_info text null,
  page_context jsonb not null default '{}'::jsonb,
  resolution_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issue_reports_organization_id_idx
  on public.issue_reports (organization_id);

create index if not exists issue_reports_status_idx
  on public.issue_reports (status);

create index if not exists issue_reports_created_at_idx
  on public.issue_reports (created_at desc);

alter table public.issue_reports enable row level security;

drop policy if exists issue_reports_insert on public.issue_reports;
drop policy if exists issue_reports_select on public.issue_reports;
drop policy if exists issue_reports_update on public.issue_reports;

create policy issue_reports_insert
on public.issue_reports
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = issue_reports.reported_by_membership_id
      and om.user_id = auth.uid()
      and om.organization_id = issue_reports.organization_id
      and om.status = 'active'
  )
);

create policy issue_reports_select
on public.issue_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = issue_reports.organization_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
);

create policy issue_reports_update
on public.issue_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = issue_reports.organization_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = issue_reports.organization_id
      and om.status = 'active'
      and om.role in ('owner', 'org_admin')
  )
);