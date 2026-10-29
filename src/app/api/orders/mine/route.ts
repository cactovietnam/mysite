import { adminClient, sameOrigin } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { games } from "@/data/games";

// GET (Bearer token đăng nhập): các đơn key ĐÃ THANH TOÁN gắn với tài khoản này, kèm key. Dùng cho trang /tai-khoan/key.
// Chỉ đơn tạo lúc đang đăng nhập mới có user_id; đơn tạo lúc chưa đăng nhập vẫn xem được trên đúng trình duyệt đã mua.
export async function GET(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return json({ code: "unauthorized" }, 401);
  try {
    const db = adminClient();
    const uid = (await db.auth.getUser(token)).data.user?.id;
    if (!uid) return json({ code: "unauthorized" }, 401);

    const { data: orders, error } = await db.from("orders").select("id, code, amount, paid_at")
      .eq("user_id", uid).eq("kind", "key").eq("status", "paid").order("paid_at", { ascending: false }).limit(50);
    if (error) throw error;
    if (!orders?.length) return json({ orders: [] });

    const { data: items, error: e2 } = await db.from("order_items").select("order_id, slug").in("order_id", orders.map((o) => o.id));
    if (e2) throw e2;
    const slugs = [...new Set((items ?? []).map((i) => i.slug))];
    const { data: keys, error: e3 } = await db.from("game_keys").select("slug, password").in("slug", slugs);
    if (e3) throw e3;
    const pw = new Map((keys ?? []).map((k) => [k.slug, k.password]));

    return json({
      orders: orders.map((o) => ({
        code: o.code, amount: o.amount, paidAt: o.paid_at,
        keys: (items ?? []).filter((i) => i.order_id === o.id).map((i) => ({
          slug: i.slug, title: games.find((g) => g.slug === i.slug)?.title ?? i.slug, password: pw.get(i.slug) ?? "",
        })),
      })),
    });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/orders/mine", method: "GET" });
    return json({ code: "error" }, 500);
  }
}
