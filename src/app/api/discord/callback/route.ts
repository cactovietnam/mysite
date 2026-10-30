import { adminClient } from "@/lib/auth-server";
import { reportError } from "@/lib/notify";
import { ACCOUNT_PATH, exchangeCode, syncRole } from "@/lib/discord";

// Discord chuyển trình duyệt về đây (điều hướng từ site khác nên KHÔNG dùng sameOrigin; an toàn nhờ state + cookie).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const back = (result: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: `${url.origin}${ACCOUNT_PATH}?discord=${result}`, "Set-Cookie": "dc_state=; Max-Age=0; Path=/api/discord; HttpOnly; SameSite=Lax" },
    });

  // state phải khớp cookie của chính trình duyệt này
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )dc_state=([^;]+)/)?.[1];
  if (!code || !state || state !== cookie) return back(url.searchParams.get("error") ? "cancelled" : "error");

  try {
    const db = adminClient();
    // xóa + trả về trong 1 lệnh: state chỉ dùng được đúng 1 lần
    const { data: st } = await db.from("discord_oauth_state").delete().eq("state", state).gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
    if (!st) return back("error");
    const userId: string = st.user_id;

    const { token, me } = await exchangeCode(code);
    const { data: cur } = await db.from("discord_links").select("discord_id").eq("user_id", userId).maybeSingle();
    if (cur && cur.discord_id !== me.id) return back("already_linked");
    if (!cur) {
      const { error } = await db.from("discord_links").insert({
        user_id: userId,
        discord_id: me.id,
        discord_username: me.global_name ?? me.username,
        discord_avatar: me.avatar,
      });
      if (error) return back(error.code === "23505" ? "discord_taken" : "error"); // Discord này đã gắn với tài khoản khác
    }
    return back(await syncRole(userId, token));
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/discord/callback", method: "GET" });
    return back("error");
  }
}
