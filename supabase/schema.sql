-- Chạy một lần trong Supabase Dashboard -> SQL Editor.
-- Tạo bảng hồ sơ (username duy nhất, không phân biệt hoa/thường) và tự điền khi có người đăng ký.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- UNIQUE thật sự nằm ở đây: hai người đăng ký cùng lúc cũng không thể trùng tên.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Người dùng chỉ đọc được hồ sơ của chính mình. Không có policy insert/update/delete:
-- chỉ trigger bên dưới (chạy với quyền hệ thống) mới ghi được, client không tự sửa được.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Form đăng ký gọi hàm này để báo "tên đã có người dùng" trước khi gửi đăng ký.
-- Lưu ý: ai cũng dò được tên nào đã tồn tại (tên đăng nhập vốn không bí mật).
create function public.username_taken(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

revoke execute on function public.username_taken(text) from public;
grant  execute on function public.username_taken(text) to anon, authenticated;
