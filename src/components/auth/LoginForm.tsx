"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { authMessage } from "@/lib/auth-errors";
import { validateEmail } from "@/lib/auth-validate";
import PasswordField from "./PasswordField";
import Turnstile from "./Turnstile";
import { btnCls, fieldCls, linkCls } from "./ui";

export default function LoginForm() {
  const uid = useId();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const m = email.trim();
    const problem = validateEmail(m) ?? (!pw ? "Hãy nhập mật khẩu." : null) ?? (!token ? "Hãy hoàn tất bước xác minh bên trên." : null);
    if (problem) { setError(problem); return; }

    const sb = getSupabase();
    if (!sb) { setError("Tính năng tài khoản chưa được cấu hình."); return; }
    setBusy(true); setError(null); setUnconfirmed(false);
    try {
      const { error: err } = await sb.auth.signInWithPassword({ email: m, password: pw, options: { captchaToken: token! } });
      if (err) { setError(authMessage(err)); setUnconfirmed(err.code === "email_not_confirmed"); return; }
      router.replace("/");
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false); setToken(null); setResetKey((k) => k + 1); // token dùng một lần
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-e`} className="sr-only">Email của bạn</label>
        <input id={`${uid}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn"
               autoComplete="email" required className={fieldCls} />
      </div>
      <PasswordField label="Mật khẩu" value={pw} onChange={setPw} placeholder="Mật khẩu" autoComplete="current-password" />

      <Turnstile onToken={setToken} resetKey={resetKey} />
      <p role="status" className="text-sm text-haze">{token ? "Đã xác minh bạn không phải bot." : "Hoàn tất xác minh bên trên để tiếp tục."}</p>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}{unconfirmed && <> <Link href="/gui-lai-xac-nhan" className="font-semibold underline">Gửi lại email xác nhận</Link></>}
        </p>
      )}
      <button type="submit" disabled={busy || !token} className={btnCls}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>

      <div className="flex flex-col items-center gap-2 pt-2 text-sm">
        <Link href="/quen-mat-khau" className={linkCls}>Quên mật khẩu?</Link>
        <Link href="/gui-lai-xac-nhan" className={linkCls}>Chưa nhận được email xác nhận?</Link>
      </div>
    </form>
  );
}
