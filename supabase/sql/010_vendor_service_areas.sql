begin;

-- =========================================================
-- 1) VENDORS: add travel + ops intelligence fields
-- =========================================================

alter table public.vendors
  add column if not exists is_active boolean not null default true,
  add column if not exists travel_available boolean not null default false,
  add column if not exists preferred_vendor boolean not null default false,
  add column if not exists website text,
  add column if not exists notes text,
  add column if not exists travel_notes text;

create index if not exists vendors_organization_id_idx
  on public.vendors (organization_id);

create index if not exists vendors_vendor_type_idx
  on public.vendors (vendor_type);

create index if not exists vendors_service_type_idx
  on public.vendors (service_type);

create index if not exists vendors_is_active_idx
  on public.vendors (is_active);

create index if not exists vendors_preferred_vendor_idx
  on public.vendors (preferred_vendor);


-- =========================================================
-- 2) VENUES: add location intelligence / geocoding fields
-- =========================================================

alter table public.venues
  add column if not exists postal_code text,
  add column if not exists country text not null default 'USA',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_at timestamptz;

create index if not exists venues_organization_id_idx
  on public.venues (organization_id);

create index if not exists venues_city_state_idx
  on public.venues (city, state);

create index if not exists venues_latitude_longitude_idx
  on public.venues (latitude, longitude);


-- =========================================================
-- 3) VENDOR SERVICE AREAS
-- =========================================================

create table if not exists public.vendor_service_areas (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  vendor_id uuid not null
    references public.vendors(id)
    on delete cascade,

  label text,
  city text not null,
  state text not null,
  postal_code text,
  country text not null default 'USA',

  latitude double precision,
  longitude double precision,
  geocoded_at timestamptz,

  service_radius_miles integer not null default 50,

  is_primary boolean not null default false,

  service_mode text not null default 'local'
    check (service_mode in ('local', 'regional', 'national')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_service_areas_organization_id_idx
  on public.vendor_service_areas (organization_id);

create index if not exists vendor_service_areas_vendor_id_idx
  on public.vendor_service_areas (vendor_id);

create index if not exists vendor_service_areas_city_state_idx
  on public.vendor_service_areas (city, state);

create index if not exists vendor_service_areas_is_primary_idx
  on public.vendor_service_areas (vendor_id, is_primary);

create index if not exists vendor_service_areas_service_mode_idx
  on public.vendor_service_areas (service_mode);

create index if not exists vendor_service_areas_lat_lng_idx
  on public.vendor_service_areas (latitude, longitude);


-- =========================================================
-- 4) UPDATED_AT trigger helper
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vendor_service_areas_updated_at
  on public.vendor_service_areas;

create trigger set_vendor_service_areas_updated_at
before update on public.vendor_service_areas
for each row
execute function public.set_updated_at();


-- =========================================================
-- 5) OPTIONAL SAFETY: only one primary service area per vendor
-- =========================================================
-- This allows many service areas, but only one row with is_primary = true
-- for a given vendor.

create unique index if not exists vendor_service_areas_one_primary_per_vendor_idx
  on public.vendor_service_areas (vendor_id)
  where is_primary = true;


-- =========================================================
-- 6) OPTIONAL RLS ENABLEMENT
-- =========================================================
-- Uncomment if you are already using RLS patterns on these tables
-- and want to lock this table down immediately.
--
-- alter table public.vendor_service_areas enable row level security;

commit;