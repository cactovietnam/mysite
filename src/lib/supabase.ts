import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // anon/publishable key: được phép lộ ra trình duyệt, quyền do RLS quyết định
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

// Thiếu biến môi trường thì web vẫn chạy bình thường, chỉ ẩn phần tài khoản.
export const authConfigured = Boolean(URL_ && KEY && TURNSTILE_SITE_KEY);

let client: SupabaseClient | null = null;

// Chỉ tạo ở trình duyệt (gọi trong effect / handler). Mặc định implicit flow: link trong email mở được cả ở thiết bị khác.
export function getSupabase(): SupabaseClient | null {
  if (!authConfigured || typeof window === "undefined") return null;
  return (client ??= createClient(URL_!, KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
}
