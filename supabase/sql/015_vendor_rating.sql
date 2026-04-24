begin;

alter table public.vendors
  add column if not exists rating numeric(2,1);

commit;