begin;

alter table public.show_vendors
  alter column organization_id set not null;

create index if not exists show_vendors_organization_id_idx
  on public.show_vendors (organization_id);

commit;