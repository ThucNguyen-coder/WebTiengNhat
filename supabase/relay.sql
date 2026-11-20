-- Konnichiwa: table for "Truyền tin" (relay) scenarios edited on the "Quản lý nội dung" page.
-- Paste this whole file into Supabase > SQL Editor and click Run. Safe to run more than once.
-- Run content.sql first: this file reuses its editor list and helper functions.
--
-- Who can do what (same as topics and words):
--   everyone (even not signed in) : read PUBLISHED scenarios
--   teacher / admin               : read everything (drafts too), add / edit / delete scenarios

do $$
begin
  if to_regprocedure('public.is_content_editor()') is null or to_regprocedure('public.set_content_stamp()') is null then
    raise exception 'Hãy chạy tệp supabase/content.sql trước, rồi chạy lại tệp này.';
  end if;
end;
$$;

-- One row = one scenario. `body` holds the characters and turns in the same shape the app uses:
--   { "cast":  { "p1": { "name", "kana", "role", "glyph", "tone" }, ... },
--     "steps": [ { "from": "p1", "to": "p2",
--                  "message": { "jp", "kana", "vi" }, "model": { "jp", "kana", "vi" },
--                  "keypoints": [ { "label", "vi", "accept": ["...", "..."] } ],
--                  "chunks": [ { "jp", "kana" } ], "extra": [ { "jp", "kana" } ] } ] }
-- `tier` empty = the app picks the tier itself (short N5 messages: tier 2, the rest: tier 3).
create table if not exists public.content_relay (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  place text not null default '' check (char_length(place) <= 60),
  level text not null default 'N5' check (level in ('N5', 'N4', 'N3')),
  tier smallint check (tier in (1, 2, 3)),
  body jsonb not null default '{"cast": {}, "steps": []}'::jsonb check (
    jsonb_typeof(body -> 'cast') = 'object'
    and jsonb_typeof(body -> 'steps') = 'array'
    and octet_length(body::text) <= 100000
  ),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_relay_order on public.content_relay (sort_order, id);

-- updated_at / updated_by (function from content.sql)
drop trigger if exists set_content_stamp on public.content_relay;
create trigger set_content_stamp before insert or update on public.content_relay
  for each row execute function public.set_content_stamp();

-- ============================================================
-- Row Level Security (identical to content_topics)
-- ============================================================

alter table public.content_relay enable row level security;

revoke all on public.content_relay from anon, authenticated;
grant select on public.content_relay to anon, authenticated;
grant insert, update, delete on public.content_relay to authenticated;

drop policy if exists "content_relay: read published" on public.content_relay;
create policy "content_relay: read published" on public.content_relay
  for select to anon, authenticated using (status = 'published' or (select public.is_content_editor()));
drop policy if exists "content_relay: editors insert" on public.content_relay;
create policy "content_relay: editors insert" on public.content_relay
  for insert to authenticated with check ((select public.is_content_editor()));
drop policy if exists "content_relay: editors update" on public.content_relay;
create policy "content_relay: editors update" on public.content_relay
  for update to authenticated using ((select public.is_content_editor())) with check ((select public.is_content_editor()));
drop policy if exists "content_relay: editors delete" on public.content_relay;
create policy "content_relay: editors delete" on public.content_relay
  for delete to authenticated using ((select public.is_content_editor()));
