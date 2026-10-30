import { adminClient } from "@/lib/auth-server";
import { reportError } from "@/lib/notify";

const API = "https://discord.com/api/v10";
const UA = "DiscordBot (https://gsvhvn.vercel.app, 1.0)"; // Discord/Cloudflare chặn User-Agent mặc định
export const ACCOUNT_PATH = "/tai-khoan/discord"; // trang Discord trong menu tài khoản

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Thiếu biến môi trường ${k}`);
  return v;
};

/** User id từ header "Authorization: Bearer <access_token Supabase>" (cùng cách với /api/orders/mine). */
export async function userIdFromRequest(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  return (await adminClient().auth.getUser(token)).data.user?.id ?? null;
}

export const authorizeUrl = (state: string) =>
  "https://discord.com/oauth2/authorize?" +
  new URLSearchParams({
    client_id: env("DISCORD_CLIENT_ID"),
    redirect_uri: env("DISCORD_REDIRECT_URI"),
    response_type: "code",
    scope: "identify guilds.join", // guilds.join: bot tự kéo khách vào server kèm role
    state,
  });

type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null };

export async function exchangeCode(code: string): Promise<{ token: string; me: DiscordUser }> {
  const t = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({
      client_id: env("DISCORD_CLIENT_ID"),
      client_secret: env("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: env("DISCORD_REDIRECT_URI"),
    }),
  });
  if (!t.ok) throw new Error(`Discord token ${t.status}: ${await t.text()}`);
  const token = (await t.json()).access_token as string;
  const m = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": UA } });
  if (!m.ok) throw new Error(`Discord /users/@me ${m.status}`);
  return { token, me: await m.json() };
}

const bot = (path: string, method: string, body?: unknown) =>
  fetch(API + path, {
    method,
    headers: { Authorization: `Bot ${env("DISCORD_BOT_TOKEN")}`, "Content-Type": "application/json", "User-Agent": UA },
    body: body ? JSON.stringify(body) : undefined,
  });

export type SyncState = "ok" | "no_purchase" | "not_in_guild" | "error";

/**
 * Cấp role Discord nếu tài khoản đã liên kết VÀ có đơn key đã thanh toán. Chạy lại bao nhiêu lần cũng được.
 * oauthToken chỉ có ngay lúc liên kết: dùng để kéo khách vào server nếu chưa ở trong.
 */
export async function syncRole(userId: string, oauthToken?: string): Promise<SyncState> {
  const db = adminClient();
  const { data: link } = await db.from("discord_links").select("discord_id").eq("user_id", userId).maybeSingle();
  if (!link) return "error";
  const discordId: string = link.discord_id;

  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "key")
    .eq("status", "paid");

  let state: SyncState = "no_purchase";
  if (count) {
    const g = env("DISCORD_GUILD_ID");
    const role = env("DISCORD_ROLE_ID");
    if (oauthToken) await bot(`/guilds/${g}/members/${discordId}`, "PUT", { access_token: oauthToken, roles: [role] });
    const r = await bot(`/guilds/${g}/members/${discordId}/roles/${role}`, "PUT");
    state = r.status === 204 ? "ok" : r.status === 404 ? "not_in_guild" : "error";
    if (state === "error") await reportError(new Error(`Discord cấp role lỗi ${r.status}: ${await r.text()}`), { source: "server", path: "/api/discord", method: "POST" });
  }
  await db.from("discord_links").update({ sync_state: state, synced_at: new Date().toISOString() }).eq("user_id", userId);
  return state;
}
