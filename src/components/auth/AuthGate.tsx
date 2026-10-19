"use client";
import Link from "next/link";
import { authConfigured, getSupabase } from "@/lib/supabase";
import { displayName, useAuthUser } from "@/lib/auth-store";
import { linkCls } from "./ui";

// Bọc form đăng nhập/đăng ký: chưa cấu hình thì báo rõ, đã đăng nhập thì khỏi hiện form.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuthUser();

  if (!authConfigured) {
    return <p role="alert" className="glass rounded-2xl px-5 py-4 text-sm text-haze">
      Tính năng tài khoản chưa được cấu hình (thiếu biến môi trường Supabase hoặc Turnstile).
    </p>;
  }
  if (user) {
    return (
      <div className="glass space-y-4 rounded-2xl px-5 py-5 text-center">
        <p>Bạn đang đăng nhập với <b className="font-semibold">{displayName(user)}</b>.</p>
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/" className={linkCls}>Về trang chủ</Link>
          <button type="button" onClick={() => { void getSupabase()?.auth.signOut(); }} className={linkCls}>Đăng xuất</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
