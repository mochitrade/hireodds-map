-- Shared map persistence: profiles, places (pins + comments), scenes

create table if not exists public.map_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  username text,
  display_name text not null default '',
  avatar_url text,
  bio text,
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists map_profiles_username_lower_idx
  on public.map_profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

alter table public.map_profiles enable row level security;

drop policy if exists "map_profiles_select_all" on public.map_profiles;
create policy "map_profiles_select_all"
  on public.map_profiles for select
  using (true);

drop policy if exists "map_profiles_insert_own" on public.map_profiles;
create policy "map_profiles_insert_own"
  on public.map_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "map_profiles_update_own" on public.map_profiles;
create policy "map_profiles_update_own"
  on public.map_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.map_places (
  id text primary key,
  payload jsonb not null,
  author_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists map_places_updated_at_idx on public.map_places (updated_at desc);

alter table public.map_places enable row level security;

drop policy if exists "map_places_select_all" on public.map_places;
create policy "map_places_select_all"
  on public.map_places for select
  using (true);

drop policy if exists "map_places_insert_auth" on public.map_places;
create policy "map_places_insert_auth"
  on public.map_places for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "map_places_update_auth" on public.map_places;
create policy "map_places_update_auth"
  on public.map_places for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create table if not exists public.map_scenes (
  id text primary key,
  label text not null,
  color text not null default '#e8843a',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.map_scenes enable row level security;

drop policy if exists "map_scenes_select_all" on public.map_scenes;
create policy "map_scenes_select_all"
  on public.map_scenes for select
  using (true);

drop policy if exists "map_scenes_insert_auth" on public.map_scenes;
create policy "map_scenes_insert_auth"
  on public.map_scenes for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "map_scenes_update_auth" on public.map_scenes;
create policy "map_scenes_update_auth"
  on public.map_scenes for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

grant select on public.map_profiles to anon, authenticated;
grant insert, update on public.map_profiles to authenticated;

grant select on public.map_places to anon, authenticated;
grant insert, update on public.map_places to authenticated;

grant select on public.map_scenes to anon, authenticated;
grant insert, update on public.map_scenes to authenticated;
