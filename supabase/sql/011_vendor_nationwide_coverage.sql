begin;

alter table public.vendors
  add column if not exists nationwide_coverage boolean not null default false;

create index if not exists vendors_nationwide_coverage_idx
  on public.vendors (nationwide_coverage);

commit;