-- Ensure shows.status supports financial_closed
alter table public.shows
add column if not exists status text;

update public.shows
set status = 'planning'
where status is null;

alter table public.shows
drop constraint if exists shows_status_check;

alter table public.shows
add constraint shows_status_check
check (
  status in (
    'draft',
    'planning',
    'confirmed',
    'active',
    'show_complete',
    'financial_closed'
  )
);

-- Lightweight notifications table for leadership / manager ping
create table if not exists public.organization_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipient_membership_id uuid not null,
  actor_membership_id uuid not null,
  show_id uuid null,
  notification_type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists org_notifications_org_idx
  on public.organization_notifications (organization_id);

create index if not exists org_notifications_recipient_idx
  on public.organization_notifications (recipient_membership_id, is_read, created_at desc);

alter table public.organization_notifications enable row level security;

drop policy if exists "org_notifications_select_own" on public.organization_notifications;
drop policy if exists "org_notifications_insert_org_member" on public.organization_notifications;
drop policy if exists "org_notifications_update_own" on public.organization_notifications;

create policy "org_notifications_select_own"
on public.organization_notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_notifications.recipient_membership_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);

create policy "org_notifications_insert_org_member"
on public.organization_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_notifications.actor_membership_id
      and om.user_id = auth.uid()
      and om.organization_id = organization_notifications.organization_id
      and om.status = 'active'
  )
);

create policy "org_notifications_update_own"
on public.organization_notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_notifications.recipient_membership_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_notifications.recipient_membership_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);