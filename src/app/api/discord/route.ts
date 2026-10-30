import { randomBytes } from "node:crypto";
import { adminClient, sameOrigin } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { authorizeUrl, syncRole, userIdFromRequest } from "@/lib/discord";

// GET (Bearer token): trạng thái liên kết Discord của tài khoản đang đăng nhập.
// Tự đồng bộ: đã liên kết + có đơn key đã thanh toán mà role chưa cấp => cấp ngay (khách vừa mua xong mở trang là có role, không cần sửa webhook).
export async function GET(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);
  const uid = await userIdFromRequest(req);
  if (!uid) return json({ code: "unauthorized" }, 401);
  try {
    const db = adminClient();
    const [link, orders] = await Promise.all([
      db.from("discord_links").select("discord_id,discord_username,discord_avatar,sync_state,synced_at").eq("user_id", uid).maybeSingle(),
      db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "key").eq("status", "paid"),
    ]);
    if (link.error) throw link.error;
    const purchases = orders.count ?? 0;
    const d = link.data;
    let state: string | undefined = d?.sync_state;
    if (d && purchases > 0 && state !== "ok" && (!d.synced_at || Date.now() - Date.parse(d.synced_at) > 30_000)) state = await syncRole(uid);
    return json({ discord: d && { id: d.discord_id, name: d.discord_username, avatar: d.discord_avatar, state }, purchases });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/discord", method: "GET" });
    return json({ code: "error" }, 500);
  }
}

/** POST {action:"link"} -> trả URL Discord để chuyển hướng | POST {action:"sync"} -> cấp lại role. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);
  const uid = await userIdFromRequest(req);
  if (!uid) return json({ code: "unauthorized" }, 401);
  try {
    const { action } = await req.json().catch(() => ({}));
    const db = adminClient();
    const { data: link } = await db.from("discord_links").select("synced_at").eq("user_id", uid).maybeSingle();

    if (action === "link") {
      if (link) return json({ code: "already_linked" }, 409);
      const now = new Date();
      await db.from("discord_oauth_state").delete().lt("expires_at", now.toISOString());
      const state = randomBytes(24).toString("base64url");
      const { error } = await db.from("discord_oauth_state").insert({ state, user_id: uid, expires_at: new Date(+now + 10 * 60_000).toISOString() });
      if (error) throw error;
      // cookie gắn state vào đúng trình duyệt này: chặn việc dụ người khác bấm link ủy quyền của kẻ xấu
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      return new Response(JSON.stringify({ url: authorizeUrl(state).toString() }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": `dc_state=${state}; Max-Age=600; Path=/api/discord; HttpOnly; SameSite=Lax${secure}` },
      });
    }

    if (action === "sync") {
      if (!link) return json({ code: "not_linked" }, 409);
      if (link.synced_at && Date.now() - Date.parse(link.synced_at) < 15_000) return json({ code: "cooldown" }, 429); // tránh dội rate limit Discord
      return json({ state: await syncRole(uid) });
    }
    return json({ code: "bad_action" }, 400);
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/discord", method: "POST" });
    return json({ code: "error" }, 500);
  }
}
