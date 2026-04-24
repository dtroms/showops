begin;

create table if not exists public.freelancer_ratings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  rated_by_user_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelancer_ratings_vendor_id_idx
  on public.freelancer_ratings (vendor_id);

create index if not exists freelancer_ratings_show_id_idx
  on public.freelancer_ratings (show_id);

create index if not exists freelancer_ratings_organization_id_idx
  on public.freelancer_ratings (organization_id);

create unique index if not exists freelancer_ratings_one_per_show_vendor_rater_idx
  on public.freelancer_ratings (show_id, vendor_id, rated_by_user_id);

create or replace function public.set_freelancer_ratings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists freelancer_ratings_set_updated_at
  on public.freelancer_ratings;

create trigger freelancer_ratings_set_updated_at
before update on public.freelancer_ratings
for each row
execute function public.set_freelancer_ratings_updated_at();

commit;