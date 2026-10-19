-- Đã áp dụng lên dự án GSVH (migration create_favorites). Giữ ở đây để dựng lại khi cần.
create table public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug       text not null check (char_length(slug) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);

alter table public.favorites enable row level security;

-- Mỗi người chỉ thấy, thêm, xóa được yêu thích của chính mình.
create policy "favorites_select_own" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites_insert_own" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites_delete_own" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));
