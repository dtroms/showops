alter table public.profiles
add column if not exists platform_role text
check (platform_role in ('platform_admin', 'platform_support'))
default null;