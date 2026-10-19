import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

// Trạng thái đăng nhập dùng chung. user: undefined = chưa biết (đang tải) | null = chưa đăng nhập | User.
// Header nằm ở layout tĩnh nên không đọc cookie phía server: trạng thái lấy từ trình duyệt sau hydrate.
let user: User | null | undefined;
let recovery = false; // true khi vừa mở link "đặt lại mật khẩu" hợp lệ
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function start() {
  if (started) return;
  started = true;
  const sb = getSupabase();
  if (!sb) { user = null; return; }
  // Callback không được await gọi ngược supabase (dễ deadlock): chỉ gán state.
  sb.auth.onAuthStateChange((event, session) => {
    user = session?.user ?? null;
    if (event === "PASSWORD_RECOVERY") recovery = true;
    if (event === "SIGNED_OUT") recovery = false;
    emit();
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  start();
  return () => { listeners.delete(cb); };
};

export const useAuthUser = () => useSyncExternalStore(subscribe, () => user, () => undefined);
export const useRecovery = () => useSyncExternalStore(subscribe, () => recovery, () => false);
export const clearRecovery = () => { recovery = false; emit(); };

// Tên hiển thị lấy từ user_metadata (người dùng tự sửa được): chỉ để hiển thị, tuyệt đối không dùng để phân quyền.
export const displayName = (u: User): string => {
  const n = (u.user_metadata as { username?: unknown } | undefined)?.username;
  return typeof n === "string" && n ? n : "Tài khoản";
};
