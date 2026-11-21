-- Konnichiwa: tables for the "Quản lý nội dung" page (topics and words edited in the app).
-- Paste this whole file into Supabase > SQL Editor and click Run. Safe to run more than once.
-- Run schema.sql first (it creates the user tables); this file only adds content tables.
--
-- Who can do what:
--   everyone (even not signed in) : read PUBLISHED topics and words
--   teacher                       : read everything (drafts too), add / edit / delete topics and words
--   admin                         : same as teacher, plus add / remove teachers by email
--
-- After running this file, make yourself admin ONCE (replace with your Google email):
--   insert into public.content_editors (email, role) values ('ban@gmail.com', 'admin');

-- ============================================================
-- Who may edit content
-- ============================================================

create table if not exists public.content_editors (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  added_by text,
  created_at timestamptz not null default now()
);

-- Email of the signed-in user (from the Google sign-in), lower case.
create or replace function public.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.content_editors e where e.email = public.current_email());
$$;

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.content_editors e where e.email = public.current_email() and e.role = 'admin');
$$;

-- anon needs them too: the "read published" rule below asks them (they simply return false).
grant execute on function public.current_email(), public.is_content_editor(), public.is_content_admin() to anon, authenticated;

-- ============================================================
-- Content
-- ============================================================

create table if not exists public.content_topics (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 60),
  jp_title text not null default '' check (char_length(jp_title) <= 40),
  level text not null default 'N5' check (level in ('N5', 'N4', 'N3')),
  color text not null default 'ai' check (color in ('shu', 'ai', 'matcha', 'yamabuki', 'sakura')),
  icon text not null default 'Sparkle' check (char_length(icon) <= 40),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_words (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.content_topics (id) on delete cascade on update cascade,
  jp text not null check (char_length(jp) between 1 and 40),
  kana text not null check (char_length(kana) between 1 and 40),
  vi text not null check (char_length(vi) between 1 and 80),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, jp)
);

create index if not exists content_words_topic on public.content_words (topic_id, sort_order);

-- Keep updated_at / updated_by fresh (set_updated_at comes from schema.sql; this one also records who).
create or replace function public.set_content_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = public.current_email();
  return new;
end;
$$;

drop trigger if exists set_content_stamp on public.content_topics;
create trigger set_content_stamp before insert or update on public.content_topics
  for each row execute function public.set_content_stamp();
drop trigger if exists set_content_stamp on public.content_words;
create trigger set_content_stamp before insert or update on public.content_words
  for each row execute function public.set_content_stamp();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.content_editors enable row level security;
alter table public.content_topics enable row level security;
alter table public.content_words enable row level security;

revoke all on public.content_editors, public.content_topics, public.content_words from anon, authenticated;
grant select on public.content_topics, public.content_words to anon, authenticated;
grant insert, update, delete on public.content_topics, public.content_words to authenticated;
grant select, insert, delete on public.content_editors to authenticated;

-- editors list: you see your own row; admins see and manage everyone (teachers only, not other admins)
drop policy if exists "editors: read" on public.content_editors;
create policy "editors: read" on public.content_editors
  for select to authenticated using (email = (select public.current_email()) or (select public.is_content_admin()));
drop policy if exists "editors: admin adds teachers" on public.content_editors;
create policy "editors: admin adds teachers" on public.content_editors
  for insert to authenticated with check ((select public.is_content_admin()) and role = 'teacher');
drop policy if exists "editors: admin removes teachers" on public.content_editors;
create policy "editors: admin removes teachers" on public.content_editors
  for delete to authenticated using ((select public.is_content_admin()) and role = 'teacher');

-- topics and words: published rows for everyone, all rows and writes for editors
do $$
declare
  t text;
begin
  foreach t in array array['content_topics', 'content_words'] loop
    execute format('drop policy if exists "%1$s: read published" on public.%1$I', t);
    execute format('create policy "%1$s: read published" on public.%1$I for select to anon, authenticated using (status = ''published'' or (select public.is_content_editor()))', t);
    execute format('drop policy if exists "%1$s: editors insert" on public.%1$I', t);
    execute format('create policy "%1$s: editors insert" on public.%1$I for insert to authenticated with check ((select public.is_content_editor()))', t);
    execute format('drop policy if exists "%1$s: editors update" on public.%1$I', t);
    execute format('create policy "%1$s: editors update" on public.%1$I for update to authenticated using ((select public.is_content_editor())) with check ((select public.is_content_editor()))', t);
    execute format('drop policy if exists "%1$s: editors delete" on public.%1$I', t);
    execute format('create policy "%1$s: editors delete" on public.%1$I for delete to authenticated using ((select public.is_content_editor()))', t);
  end loop;
end;
$$;
