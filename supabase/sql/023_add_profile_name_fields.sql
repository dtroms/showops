begin;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text,
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or btrim(p.email) = '');

update public.profiles p
set
  first_name = coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1)), '')
  ),
  last_name = coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'last_name'), ''),
    nullif(
      btrim(
        replace(
          coalesce(u.raw_user_meta_data ->> 'full_name', ''),
          split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1),
          ''
        )
      ),
      ''
    )
  ),
  full_name = coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(
      btrim(
        concat_ws(
          ' ',
          nullif(btrim(u.raw_user_meta_data ->> 'first_name'), ''),
          nullif(btrim(u.raw_user_meta_data ->> 'last_name'), '')
        )
      ),
      ''
    )
  )
from auth.users u
where p.id = u.id
  and (
    p.first_name is null
    or p.last_name is null
    or p.full_name is null
    or btrim(coalesce(p.full_name, '')) = ''
  );

update public.profiles
set full_name = nullif(
  btrim(concat_ws(' ', nullif(btrim(first_name), ''), nullif(btrim(last_name), ''))),
  ''
)
where (full_name is null or btrim(full_name) = '')
  and (
    nullif(btrim(first_name), '') is not null
    or nullif(btrim(last_name), '') is not null
  );

create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql
as $$
begin
  new.first_name := nullif(btrim(new.first_name), '');
  new.last_name := nullif(btrim(new.last_name), '');
  new.email := nullif(btrim(new.email), '');

  if new.full_name is null or btrim(new.full_name) = '' then
    new.full_name := nullif(
      btrim(concat_ws(' ', new.first_name, new.last_name)),
      ''
    );
  else
    new.full_name := nullif(btrim(new.full_name), '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_full_name on public.profiles;

create trigger trg_profiles_sync_full_name
before insert or update on public.profiles
for each row
execute function public.sync_profile_full_name();

create index if not exists profiles_email_idx
  on public.profiles (email);

create index if not exists profiles_full_name_idx
  on public.profiles (full_name);

commit;