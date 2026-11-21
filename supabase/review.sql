-- Ôn tập đúng lúc: lịch ôn của từng từ cho mỗi tài khoản.
-- Chạy file này MỘT lần trong Supabase (SQL Editor) sau khi đã chạy schema.sql.
-- Chạy lại nhiều lần cũng không sao: chỉ thêm, không xoá dữ liệu.
-- Khi chưa chạy file này, app vẫn chạy bình thường; lịch ôn chỉ được lưu trên máy (trình duyệt).

create table if not exists public.word_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 40),
  box smallint not null default 0 check (box between 0 and 5),       -- hộp 1..6 (lưu 0..5)
  right_count integer not null default 0 check (right_count >= 0),   -- số lần trả lời đúng
  wrong_count integer not null default 0 check (wrong_count >= 0),   -- số lần trả lời sai
  last_seen date,                                                    -- lần gặp gần nhất
  due date,                                                          -- ngày cần ôn lại
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

create index if not exists word_reviews_due_idx on public.word_reviews (user_id, due);

-- Giữ updated_at mới (hàm set_updated_at đã có trong schema.sql)
drop trigger if exists set_updated_at on public.word_reviews;
create trigger set_updated_at before update on public.word_reviews
  for each row execute function public.set_updated_at();

-- Bảo mật: mỗi người chỉ đọc/ghi lịch của chính mình
alter table public.word_reviews enable row level security;
revoke all on public.word_reviews from anon;
grant select, insert, update, delete on public.word_reviews to authenticated;

drop policy if exists "word_reviews: read own" on public.word_reviews;
create policy "word_reviews: read own" on public.word_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "word_reviews: insert own" on public.word_reviews;
create policy "word_reviews: insert own" on public.word_reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "word_reviews: update own" on public.word_reviews;
create policy "word_reviews: update own" on public.word_reviews
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "word_reviews: delete own" on public.word_reviews;
create policy "word_reviews: delete own" on public.word_reviews
  for delete to authenticated using ((select auth.uid()) = user_id);
