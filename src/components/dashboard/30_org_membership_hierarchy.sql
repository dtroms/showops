alter table public.organization_memberships
add column if not exists manager_membership_id uuid references public.organization_memberships(id) on delete set null;

create index if not exists idx_org_memberships_manager
on public.organization_memberships(manager_membership_id);