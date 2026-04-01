create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan_type text not null default 'starter',
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_override_type text not null default 'none',
  billing_override_reason text,
  billing_override_expires_at timestamptz,
  billing_override_set_by uuid,
  billing_override_created_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists clients_org_idx on public.clients (organization_id);
create index if not exists clients_name_idx on public.clients (name);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  state text,
  address text,
  created_at timestamptz not null default now()
);

create index if not exists venues_org_idx on public.venues (organization_id);
create index if not exists venues_name_idx on public.venues (name);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_name text not null,
  show_number text not null,
  parent_project_name text,
  client_id uuid references public.clients(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  city text,
  state text,
  start_date date not null,
  end_date date not null,
  estimated_revenue numeric(12,2),
  status text not null default 'draft',
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists shows_org_idx on public.shows (organization_id);
create index if not exists shows_dates_idx on public.shows (start_date, end_date);
create index if not exists shows_client_idx on public.shows (client_id);
create index if not exists shows_venue_idx on public.shows (venue_id);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_name text not null,
  vendor_type text not null,
  service_type text,
  contact_name text,
  email text,
  phone text,
  city text,
  default_cost numeric(12,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists vendors_org_idx on public.vendors (organization_id);
create index if not exists vendors_name_idx on public.vendors (vendor_name);

create table if not exists public.show_vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  vendor_name_snapshot text not null,
  vendor_type_snapshot text,
  service_type_snapshot text,
  contact_name_snapshot text,
  email_snapshot text,
  phone_snapshot text,
  default_day_rate_snapshot numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists show_vendors_org_idx on public.show_vendors (organization_id);
create index if not exists show_vendors_show_idx on public.show_vendors (show_id);
create index if not exists show_vendors_vendor_idx on public.show_vendors (vendor_id);

create table if not exists public.supply_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supply_name text not null,
  unit_type text,
  default_cost numeric(12,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists supply_items_org_idx on public.supply_items (organization_id);
create index if not exists supply_items_name_idx on public.supply_items (supply_name);

create table if not exists public.gear_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gear_categories_org_idx on public.gear_categories (organization_id);

create table if not exists public.gear_subcategories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.gear_categories(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gear_subcategories_org_idx on public.gear_subcategories (organization_id);
create index if not exists gear_subcategories_category_idx on public.gear_subcategories (category_id);

create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_name text not null,
  category_id uuid not null references public.gear_categories(id) on delete restrict,
  subcategory_id uuid references public.gear_subcategories(id) on delete set null,
  internal_cost numeric(12,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gear_items_org_idx on public.gear_items (organization_id);
create index if not exists gear_items_category_idx on public.gear_items (category_id);
create index if not exists gear_items_subcategory_idx on public.gear_items (subcategory_id);

create table if not exists public.gear_item_rental_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gear_item_id uuid not null references public.gear_items(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists gear_item_rental_sources_org_idx on public.gear_item_rental_sources (organization_id);
create index if not exists gear_item_rental_sources_item_idx on public.gear_item_rental_sources (gear_item_id);
create index if not exists gear_item_rental_sources_vendor_idx on public.gear_item_rental_sources (vendor_id);

create table if not exists public.show_budget_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  reference_id uuid,
  section_type text not null,
  subgroup_type text,
  line_name text not null,
  quantity numeric(12,2) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  overtime_enabled boolean not null default false,
  overtime_hours numeric(12,2),
  overtime_rate numeric(12,2),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists show_budget_line_items_org_idx on public.show_budget_line_items (organization_id);
create index if not exists show_budget_line_items_show_idx on public.show_budget_line_items (show_id);
create index if not exists show_budget_line_items_vendor_idx on public.show_budget_line_items (vendor_id);
create index if not exists show_budget_line_items_section_idx on public.show_budget_line_items (section_type, subgroup_type);