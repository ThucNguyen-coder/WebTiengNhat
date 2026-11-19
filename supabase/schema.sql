-- Konnichiwa: database schema for user progress.
-- Paste this whole file into Supabase > SQL Editor and click Run.
-- Safe to run more than once.
--
-- Data kept is only what learning needs. No real names, birthdays,
-- addresses or phone numbers. Email lives in Supabase Auth only.
-- Every table has Row Level Security: a signed-in user can read and
-- change only their own rows. Anonymous visitors can read nothing.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40), -- optional nickname, empty by default
  settings jsonb not null default '{}'::jsonb,                -- furigana, romaji, theme, sound, voice rate...
  daily_goal integer not null default 30 check (daily_goal between 5 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_active date,
  daily_date date,
  daily_xp integer not null default 0 check (daily_xp >= 0),
  game_best integer not null default 0 check (game_best >= 0),
  updated_at timestamptz not null default now()
);

-- One row per finished station on the line map (e.g. 'chao-hoi:L0', 'chao-hoi:game').
create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id text not null check (char_length(node_id) between 1 and 80),
  stars smallint not null default 1 check (stars between 0 and 3),
  completed_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- One row per learned word (the Japanese written form).
create table if not exists public.words_learned (
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 40),
  times_correct integer not null default 1 check (times_correct >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

-- Best score per relay (Truyen tin) letter.
create table if not exists public.relay_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null check (char_length(scenario_id) between 1 and 80),
  best_score smallint not null default 0 check (best_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, scenario_id)
);

-- ============================================================
-- Keep updated_at fresh
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_progress;
create trigger set_updated_at before update on public.user_progress
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.words_learned;
create trigger set_updated_at before update on public.words_learned
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.relay_results;
create trigger set_updated_at before update on public.relay_results
  for each row execute function public.set_updated_at();

-- ============================================================
-- Create empty profile and progress rows when someone signs up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_progress (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- Let a signed-in user delete their own account (and all their rows)
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid(); -- cascades to every table above
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.words_learned enable row level security;
alter table public.relay_results enable row level security;

-- Only signed-in users can touch these tables at all.
revoke all on public.profiles, public.user_progress, public.lesson_completions,
  public.words_learned, public.relay_results from anon;
grant select, insert, update, delete on public.profiles, public.user_progress,
  public.lesson_completions, public.words_learned, public.relay_results to authenticated;

-- profiles: the row id is the user id
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- the other tables: rows belong to user_id
do $$
declare
  t text;
begin
  foreach t in array array['user_progress', 'lesson_completions', 'words_learned', 'relay_results'] loop
    execute format('drop policy if exists "%1$s: read own" on public.%1$I', t);
    execute format('create policy "%1$s: read own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "%1$s: insert own" on public.%1$I', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "%1$s: update own" on public.%1$I', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "%1$s: delete own" on public.%1$I', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
