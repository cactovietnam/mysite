"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { authMessage } from "@/lib/auth-errors";
import { validateEmail, validatePassword, validateUsername } from "@/lib/auth-validate";
import PasswordField from "./PasswordField";
import Turnstile from "./Turnstile";
import { btnCls, fieldCls, linkCls } from "./ui";

export default function SignupForm() {
  const uid = useId();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Token Turnstile dùng một lần: sau mỗi lần gửi (kể cả lỗi) phải lấy token mới.
  const renewCaptcha = () => { setToken(null); setResetKey((k) => k + 1); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const u = username.trim(), m = email.trim();
    const problem = validateUsername(u) ?? validateEmail(m) ?? validatePassword(pw)
      ?? (pw !== pw2 ? "Mật khẩu xác nhận không khớp." : null)
      ?? (!agreed ? "Bạn cần đồng ý với Điều khoản và Chính sách bảo mật." : null)
      ?? (!token ? "Hãy hoàn tất bước xác minh bên trên." : null);
    if (problem) { setError(problem); return; }

    const sb = getSupabase();
    if (!sb) { setError("Tính năng tài khoản chưa được cấu hình."); return; }
    setBusy(true); setError(null);
    try {
      // Kiểm tra trước để báo lỗi rõ ràng; ràng buộc UNIQUE trong DB mới là chốt chặn thật (xem supabase/schema.sql).
      const taken = await sb.rpc("username_taken", { name: u });
      if (taken.error) { setError("Không kiểm tra được tên đăng nhập. Thử lại sau ít phút."); return; }
      if (taken.data === true) { setError("Tên đăng nhập này đã có người dùng."); return; }

      const { error: err } = await sb.auth.signUp({
        email: m,
        password: pw,
        options: { data: { username: u }, emailRedirectTo: `${window.location.origin}/xac-nhan`, captchaToken: token! },
      });
      if (err) { setError(authMessage(err)); return; }
      setSentTo(m); // email đã đăng ký sẵn cũng ra thông báo y hệt: không để lộ email nào có tài khoản
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false); renewCaptcha();
    }
  };

  if (sentTo) {
    return (
      <div role="status" className="glass space-y-4 rounded-2xl px-6 py-6 text-center">
        <h2 className="font-display text-2xl font-bold">Kiểm tra email của bạn</h2>
        <p className="leading-relaxed text-haze">
          Nếu <b className="font-semibold text-mist">{sentTo}</b> chưa có tài khoản, chúng tôi vừa gửi email xác nhận.
          Bấm vào link trong email để kích hoạt tài khoản. Nhớ xem cả thư rác.
        </p>
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link href="/gui-lai-xac-nhan" className={linkCls}>Chưa nhận được email? Gửi lại</Link>
          <Link href="/dang-nhap" className={linkCls}>Đã xác nhận? Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-u`} className="sr-only">Tên đăng nhập</label>
        <input id={`${uid}-u`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập"
               autoComplete="username" maxLength={20} required className={fieldCls} />
      </div>
      <div>
        <label htmlFor={`${uid}-e`} className="sr-only">Email của bạn</label>
        <input id={`${uid}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn"
               autoComplete="email" required className={fieldCls} />
      </div>
      <PasswordField label="Mật khẩu" value={pw} onChange={setPw} placeholder="Mật khẩu (tối thiểu 12 ký tự)" autoComplete="new-password" />
      <PasswordField label="Xác nhận mật khẩu" value={pw2} onChange={setPw2} placeholder="Xác nhận mật khẩu" autoComplete="new-password" />

      <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-relaxed">
        <input type="checkbox" className="peer sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-berry ${
          agreed ? "border-berry bg-berry text-ink" : "border-white/30"}`}>
          {agreed && (
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4.5 10.5 3.5 3.5 7.5-8" />
            </svg>
          )}
        </span>
        <span>
          Tôi đồng ý với <Link href="/dieu-khoan#dieu-khoan" target="_blank" className="font-semibold text-mist underline-offset-2 hover:underline">Điều khoản dịch vụ</Link>{" "}
          và <Link href="/dieu-khoan#bao-mat" target="_blank" className="font-semibold text-mist underline-offset-2 hover:underline">Chính sách bảo mật</Link>.
        </span>
      </label>

      <Turnstile onToken={setToken} resetKey={resetKey} />
      <p role="status" className="text-sm text-haze">{token ? "Đã xác minh bạn không phải bot." : "Hoàn tất xác minh bên trên để tiếp tục."}</p>

      {error && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !token} className={btnCls}>{busy ? "Đang xử lý…" : "Tạo tài khoản"}</button>
    </form>
  );
}
