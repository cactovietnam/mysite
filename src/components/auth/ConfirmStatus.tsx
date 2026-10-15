"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAuthUser } from "@/lib/auth-store";
import { authConfigured } from "@/lib/supabase";
import { btnCls, linkCls } from "./ui";

// Chụp hash lúc vào trang: Supabase gắn lỗi (link hết hạn...) vào #error=... rồi tự xóa sau khi xử lý.
let firstHash: string | null = null;
const readHash = () => (firstHash ??= window.location.hash);
const noSub = () => () => {};

// Trang đích của link "xác nhận email". Link hợp lệ thì supabase-js tự đăng nhập; link lỗi thì có #error=...
export default function ConfirmStatus() {
  const user = useAuthUser();
  const hash = useSyncExternalStore(noSub, readHash, () => "");
  const failed = /[#&]error=/.test(hash);

  if (!authConfigured) return <p className="text-center text-haze">Tính năng tài khoản chưa được cấu hình.</p>;

  if (failed) {
    return (
      <div role="alert" className="glass space-y-4 rounded-2xl px-6 py-6 text-center">
        <p className="text-haze">Link xác nhận không hợp lệ hoặc đã hết hạn.</p>
        <Link href="/gui-lai-xac-nhan" className={linkCls}>Gửi lại email xác nhận</Link>
      </div>
    );
  }
  if (user) {
    return (
      <div role="status" className="glass space-y-5 rounded-2xl px-6 py-6 text-center">
        <p className="text-haze">Email đã được xác nhận và bạn đã đăng nhập.</p>
        <Link href="/" className={`${btnCls} inline-block`}>Về trang chủ</Link>
      </div>
    );
  }
  if (user === undefined) return <p role="status" className="text-center text-haze">Đang xác nhận…</p>;
  return (
    <div className="glass space-y-4 rounded-2xl px-6 py-6 text-center">
      <p className="text-haze">Không thấy thông tin xác nhận. Nếu bạn vừa bấm link trong email, hãy thử đăng nhập.</p>
      <Link href="/dang-nhap" className={linkCls}>Đăng nhập</Link>
    </div>
  );
}
