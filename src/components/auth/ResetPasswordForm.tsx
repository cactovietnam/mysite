"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import { authMessage } from "@/lib/auth-errors";
import { validatePassword } from "@/lib/auth-validate";
import { clearRecovery, useAuthUser, useRecovery } from "@/lib/auth-store";
import PasswordField from "./PasswordField";
import { btnCls, linkCls } from "./ui";

// Chụp hash URL một lần: supabase-js xóa hash sau khi xử lý nên đọc lại sẽ mất thông tin lỗi (vd link hết hạn).
let firstHash: string | null = null;
const readHash = () => (firstHash ??= window.location.hash);
const noSub = () => () => {};

// Trang đích của link "đặt lại mật khẩu" trong email. Chỉ hiện form khi Supabase xác nhận link hợp lệ (sự kiện PASSWORD_RECOVERY).
export default function ResetPasswordForm() {
  const user = useAuthUser();
  const recovery = useRecovery();
  const hash = useSyncExternalStore(noSub, readHash, () => "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div role="status" className="glass space-y-4 rounded-2xl px-6 py-6 text-center">
        <h2 className="font-display text-2xl font-bold">Đã đổi mật khẩu</h2>
        <p className="text-haze">Các thiết bị khác đã bị đăng xuất. Bạn đang đăng nhập trên thiết bị này.</p>
        <Link href="/" className={linkCls}>Về trang chủ</Link>
      </div>
    );
  }

  if (!recovery) {
    // Link hợp lệ: INITIAL_SESSION tới trước PASSWORD_RECOVERY vài ms, nên đừng báo lỗi sớm.
    const waiting = !hash.includes("error") && (user === undefined || hash.includes("type=recovery"));
    if (waiting) return <p role="status" className="text-center text-haze">Đang kiểm tra link…</p>;
    return (
      <div role="alert" className="glass space-y-4 rounded-2xl px-6 py-6 text-center">
        <p className="text-haze">Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
        <Link href="/quen-mat-khau" className={linkCls}>Yêu cầu link mới</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = validatePassword(pw) ?? (pw !== pw2 ? "Mật khẩu xác nhận không khớp." : null);
    if (problem) { setError(problem); return; }
    const sb = getSupabase();
    if (!sb) { setError("Tính năng tài khoản chưa được cấu hình."); return; }
    setBusy(true); setError(null);
    try {
      const { error: err } = await sb.auth.updateUser({ password: pw });
      if (err) { setError(authMessage(err)); return; }
      await sb.auth.signOut({ scope: "others" }); // đổi mật khẩu xong thì đá mọi thiết bị khác ra
      clearRecovery();
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PasswordField label="Mật khẩu mới" value={pw} onChange={setPw} placeholder="Mật khẩu mới (tối thiểu 12 ký tự)" autoComplete="new-password" />
      <PasswordField label="Xác nhận mật khẩu mới" value={pw2} onChange={setPw2} placeholder="Xác nhận mật khẩu mới" autoComplete="new-password" />
      {error && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className={btnCls}>{busy ? "Đang lưu…" : "Đổi mật khẩu"}</button>
    </form>
  );
}
