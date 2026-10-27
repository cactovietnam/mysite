import { adminClient } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { games } from "@/data/games";

// Giá key công khai (KHÔNG có mật khẩu). Chỉ game đang bật, đã có mật khẩu và vẫn còn trong games.json.
// price + fee là giá hiển thị; số tiền thật của đơn luôn do /api/orders tính lại ở server.
export async function GET() {
  try {
    const { data, error } = await adminClient().from("game_keys")
      .select("slug, price, fee").eq("enabled", true).neq("password", "");
    if (error) throw error;
    const alive = new Set(games.map((g) => g.slug));
    const items = (data ?? []).filter((r) => alive.has(r.slug) && r.price + r.fee > 0);
    return json({ items });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/keys", method: "GET" });
    return json({ code: "error" }, 500);
  }
}
