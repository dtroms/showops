begin;

update public.show_memberships
set assignment_type = 'manual'
where assignment_type is null;

alter table public.show_memberships
drop constraint if exists show_memberships_assignment_type_check;

alter table public.show_memberships
alter column assignment_type set default 'manual';

alter table public.show_memberships
alter column assignment_type set not null;

alter table public.show_memberships
add constraint show_memberships_assignment_type_check
check (
  assignment_type in (
    'manual',
    'manager_assigned',
    'self_selected',
    'auto_creator'
  )
);

commit;