"use client";
import { useId, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { authMessage } from "@/lib/auth-errors";
import { validateEmail } from "@/lib/auth-validate";
import Turnstile from "./Turnstile";
import { btnCls, fieldCls } from "./ui";

const COPY = {
  reset: {
    button: "Gửi link đặt lại mật khẩu",
    done: "Nếu email này đã có tài khoản, chúng tôi vừa gửi link đặt lại mật khẩu. Link có hạn dùng, nhớ xem cả thư rác.",
  },
  resend: {
    button: "Gửi lại email xác nhận",
    done: "Nếu email này đã đăng ký và chưa xác nhận, chúng tôi vừa gửi lại email xác nhận. Nhớ xem cả thư rác.",
  },
} as const;

// Form một ô email + Turnstile, dùng cho "Quên mật khẩu" và "Gửi lại email xác nhận".
// Thông báo thành công luôn giống nhau dù email có tồn tại hay không: không để lộ email nào đã đăng ký.
export default function EmailForm({ mode }: { mode: "reset" | "resend" }) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const m = email.trim();
    const problem = validateEmail(m) ?? (!token ? "Hãy hoàn tất bước xác minh bên trên." : null);
    if (problem) { setError(problem); return; }

    const sb = getSupabase();
    if (!sb) { setError("Tính năng tài khoản chưa được cấu hình."); return; }
    setBusy(true); setError(null);
    try {
      const origin = window.location.origin;
      const { error: err } = mode === "reset"
        ? await sb.auth.resetPasswordForEmail(m, { redirectTo: `${origin}/dat-lai-mat-khau`, captchaToken: token! })
        : await sb.auth.resend({ type: "signup", email: m, options: { emailRedirectTo: `${origin}/xac-nhan`, captchaToken: token! } });
      if (err) { setError(authMessage(err)); return; }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false); setToken(null); setResetKey((k) => k + 1);
    }
  };

  if (done) {
    return <p role="status" className="glass rounded-2xl px-6 py-5 leading-relaxed text-haze">{COPY[mode].done}</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-e`} className="sr-only">Email của bạn</label>
        <input id={`${uid}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn"
               autoComplete="email" required className={fieldCls} />
      </div>
      <Turnstile onToken={setToken} resetKey={resetKey} />
      <p role="status" className="text-sm text-haze">{token ? "Đã xác minh bạn không phải bot." : "Hoàn tất xác minh bên trên để tiếp tục."}</p>
      {error && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !token} className={btnCls}>{busy ? "Đang gửi…" : COPY[mode].button}</button>
    </form>
  );
}
