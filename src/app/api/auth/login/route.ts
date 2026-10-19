import { NextResponse } from "next/server";
import { adminClient, anonClient, getAuthSettings, sameOrigin } from "@/lib/auth-server";
import { reportError } from "@/lib/notify";
import { USERNAME_RE, toEmail } from "@/lib/auth-validate";

const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Đăng nhập bằng tên tài khoản + khóa khi sai quá số lần. Captcha do Supabase tự kiểm (token dùng một lần nên không kiểm hai lần).
// Thứ tự: giữ chỗ 1 lượt (login_begin, nguyên tử) -> thử mật khẩu -> đúng thì xóa bộ đếm, sai thì giữ lượt, lỗi khác thì trả lượt.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);

  let b: { username?: unknown; password?: unknown; captchaToken?: unknown };
  try { b = await req.json(); } catch { return json({ code: "invalid" }, 400); }
  const { username, password, captchaToken } = b;
  if (typeof username !== "string" || !USERNAME_RE.test(username)) return json({ code: "invalid" }, 400);
  if (typeof password !== "string" || !password || password.length > 128) return json({ code: "invalid" }, 400);
  if (typeof captchaToken !== "string" || !captchaToken) return json({ code: "captcha" }, 400);

  const key = username.toLowerCase();
  let reserved = false;
  let db: ReturnType<typeof adminClient> | null = null;
  const refund = async () => { if (reserved && db) { reserved = false; await db.rpc("login_refund", { p_user: key }); } };

  try {
    db = adminClient();
    const cfg = await getAuthSettings(db);
    const begin = await db.rpc("login_begin", { p_user: key, p_max: cfg.maxAttempts, p_lock_minutes: cfg.lockMinutes });
    if (begin.error) throw begin.error;
    const row = (begin.data as { out_allowed: boolean; out_attempts: number }[] | null)?.[0];
    if (!row) throw new Error("login_begin không trả về dữ liệu");
    if (!row.out_allowed) return json({ code: "locked", lockMinutes: cfg.lockMinutes }, 423);
    reserved = true;

    const { data, error } = await anonClient().auth.signInWithPassword({ email: toEmail(key), password, options: { captchaToken } });

    if (!error && data.session) {
      reserved = false;
      await db.from("login_state").delete().eq("username_lc", key);
      return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
    }
    if (error?.code === "invalid_credentials") { // sai mật khẩu HOẶC tên không tồn tại: Supabase không phân biệt, ta cũng không
      reserved = false; // lượt này đã tính
      if (row.out_attempts >= cfg.maxAttempts) {
        await db.from("login_state").update({ locked_at: new Date().toISOString() }).eq("username_lc", key).is("locked_at", null);
        return json({ code: "locked", lockMinutes: cfg.lockMinutes }, 423);
      }
      return json({ code: "invalid", remaining: cfg.maxAttempts - row.out_attempts }, 401);
    }

    await refund(); // lỗi không phải do sai mật khẩu: không được tính vào lượt, nếu không ai cũng khóa được tài khoản người khác bằng captcha giả
    if (error?.code === "captcha_failed") return json({ code: "captcha" }, 400);
    if (error?.code === "over_request_rate_limit") return json({ code: "rate" }, 429);
    throw error ?? new Error("signInWithPassword không trả về phiên"); // vd email_not_confirmed = chưa tắt "Confirm email" trong Supabase
  } catch (e) {
    await refund().catch(() => {});
    await reportError(e, { source: "server", path: "/api/auth/login", method: "POST" });
    return json({ code: "error" }, 500);
  }
}
