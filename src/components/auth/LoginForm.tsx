"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { site } from "@/data/site";
import { validateUsername } from "@/lib/auth-validate";
import { takeReturnTo } from "@/lib/after-auth";
import PasswordField from "./PasswordField";
import Turnstile from "./Turnstile";
import { btnCls, fieldCls, linkCls } from "./ui";

// Quên mật khẩu: chuyển sang Facebook hỗ trợ. Link lấy từ site.json (quan_ly.py mục 7), trống thì dùng link cố định này.
const FORGOT_FALLBACK = "https://www.facebook.com/profile.php?id=61591215583142";
const forgotUrl = /^https?:\/\//i.test(site.facebook) ? site.facebook : FORGOT_FALLBACK;

type Reply = { code?: string; remaining?: number; lockMinutes?: number; session?: { access_token: string; refresh_token: string } };

function loginMessage(b: Reply): string {
  switch (b.code) {
    case "locked":
      return b.lockMinutes
        ? `Tài khoản tạm khóa do nhập sai quá nhiều lần. Thử lại sau ${b.lockMinutes} phút, hoặc liên hệ quản trị viên qua Facebook.`
        : "Tài khoản bị khóa do nhập sai quá nhiều lần. Hãy liên hệ quản trị viên qua Facebook để được mở khóa.";
    case "invalid":
      return b.remaining !== undefined
        ? `Tên tài khoản hoặc mật khẩu không đúng. Còn ${b.remaining} lần thử trước khi bị khóa.`
        : "Tên tài khoản hoặc mật khẩu không đúng.";
    case "captcha": return "Xác minh không hợp lệ hoặc đã hết hạn. Hãy làm lại bước xác minh.";
    case "rate": return "Bạn thao tác quá nhanh. Đợi một lúc rồi thử lại.";
    default: return "Có lỗi xảy ra. Thử lại sau ít phút.";
  }
}

export default function LoginForm() {
  const uid = useId();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const u = username.trim();
    const problem = validateUsername(u) ?? (!pw ? "Hãy nhập mật khẩu." : null) ?? (!token ? "Hãy hoàn tất bước xác minh bên trên." : null);
    if (problem) { setError(problem); return; }

    const sb = getSupabase();
    if (!sb) { setError("Tính năng tài khoản chưa được cấu hình."); return; }
    setBusy(true); setError(null);
    try {
      // Đi qua máy chủ để đếm lần sai và khóa tài khoản; máy chủ trả phiên đăng nhập, trình duyệt nhận bằng setSession.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: pw, captchaToken: token }),
      });
      const body: Reply = await res.json().catch(() => ({}));
      if (res.ok && body.session) {
        const { error: err } = await sb.auth.setSession(body.session);
        if (err) { setError("Có lỗi xảy ra. Thử lại sau ít phút."); return; }
        router.replace(takeReturnTo()); // về lại game đang định tải (nếu có), không thì trang chủ
        return;
      }
      setError(loginMessage(body));
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false); setToken(null); setResetKey((k) => k + 1); // token dùng một lần
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-u`} className="sr-only">Tên tài khoản</label>
        <input id={`${uid}-u`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên tài khoản"
               autoComplete="username" maxLength={12} required className={fieldCls} />
      </div>
      <PasswordField label="Mật khẩu" value={pw} onChange={setPw} placeholder="Mật khẩu" autoComplete="current-password" />

      <Turnstile onToken={setToken} resetKey={resetKey} />
      <p role="status" className="text-sm text-haze">{token ? "Đã xác minh bạn không phải bot." : "Hoàn tất xác minh bên trên để tiếp tục."}</p>

      {error && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !token} className={btnCls}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>

      <div className="flex flex-col items-center gap-2 pt-2 text-sm">
        <a href={forgotUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>Bạn quên mật khẩu?</a>
      </div>
    </form>
  );
}
