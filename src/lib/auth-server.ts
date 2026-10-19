// Chỉ import từ code chạy trên server (route handler). Dùng SUPABASE_SERVICE_ROLE_KEY: tuyệt đối không đưa vào client.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, opts);
}

export function anonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key, opts);
}

export type AuthSettings = { maxAttempts: number; lockMinutes: number };
const DEFAULTS: AuthSettings = { maxAttempts: 5, lockMinutes: 30 };
const clamp = (n: unknown, lo: number, hi: number, d: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n))) : d;

// shortcut: cache theo từng instance serverless, đổi cài đặt có hiệu lực sau tối đa 30s.
let cache: { at: number; v: AuthSettings } | null = null;
export async function getAuthSettings(db: SupabaseClient): Promise<AuthSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  let v = DEFAULTS;
  const { data } = await db.from("app_settings").select("value").eq("key", "auth").maybeSingle();
  if (data?.value && typeof data.value === "object") {
    const s = data.value as Record<string, unknown>;
    v = { maxAttempts: clamp(s.maxAttempts, 1, 20, DEFAULTS.maxAttempts), lockMinutes: clamp(s.lockMinutes, 0, 10_080, DEFAULTS.lockMinutes) };
  }
  cache = { at: Date.now(), v };
  return v;
}

// Chặn request từ trang web khác. Không có Origin (curl, công cụ ngoài trình duyệt) thì cho qua: các route vẫn tự kiểm quyền.
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true;
  try { return new URL(o).host === req.headers.get("host"); } catch { return false; } // Origin: "null" không làm route ném lỗi
}
