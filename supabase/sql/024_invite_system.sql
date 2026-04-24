begin;

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (
    role in (
      'owner',
      'org_admin',
      'ops_manager',
      'project_manager',
      'warehouse_admin',
      'coordinator',
      'crew'
    )
  ),
  token text not null unique,
  invited_by_user_id uuid null references auth.users(id) on delete set null,
  invited_by_membership_id uuid null references public.organization_memberships(id) on delete set null,
  accepted_by_user_id uuid null references auth.users(id) on delete set null,
  accepted_at timestamptz null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists organization_invites_org_idx
  on public.organization_invites (organization_id, created_at desc);

create index if not exists organization_invites_email_idx
  on public.organization_invites (email);

create index if not exists organization_invites_token_idx
  on public.organization_invites (token);

alter table public.organization_invites enable row level security;

drop policy if exists organization_invites_select_phase1 on public.organization_invites;
create policy organization_invites_select_phase1
on public.organization_invites
for select
to authenticated
using (
  organization_id in (select * from public.my_active_org_ids())
);

drop policy if exists organization_invites_insert_phase1 on public.organization_invites;
create policy organization_invites_insert_phase1
on public.organization_invites
for insert
to authenticated
with check (
  organization_id in (select * from public.my_active_org_ids())
);

drop policy if exists organization_invites_update_phase1 on public.organization_invites;
create policy organization_invites_update_phase1
on public.organization_invites
for update
to authenticated
using (
  organization_id in (select * from public.my_active_org_ids())
)
with check (
  organization_id in (select * from public.my_active_org_ids())
);

drop policy if exists organization_invites_delete_phase1 on public.organization_invites;
create policy organization_invites_delete_phase1
on public.organization_invites
for delete
to authenticated
using (
  organization_id in (select * from public.my_active_org_ids())
);

commit;