alter table public.venues
  add column if not exists notes text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_role text,
  add column if not exists primary_contact_email text,
  add column if not exists primary_contact_phone text,
  add column if not exists is_active boolean not null default true;

create index if not exists venues_active_idx on public.venues (is_active);