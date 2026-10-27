import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { ORDER_PREFIX } from "@/lib/payment";
import { games } from "@/data/games";

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// GET /api/orders/GSVHxxxxxx?t=<token>: trạng thái đơn. Đơn key đã thanh toán + đúng token thì trả luôn key.
// Token chỉ có ở trình duyệt đã tạo đơn, nên biết mã đơn thôi thì không lấy được key.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!new RegExp(`^${ORDER_PREFIX}[A-Z0-9]{6}$`).test(code)) return json({ code: "invalid" }, 400);
  const t = new URL(req.url).searchParams.get("t") ?? "";

  try {
    const db = adminClient();
    const { data, error } = await db.from("orders")
      .select("id, kind, status, amount, paid_amount, expires_at, token").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) return json({ code: "not_found" }, 404);
    const expired = data.status === "pending" && Date.parse(data.expires_at) < Date.now();
    const out: Record<string, unknown> = { status: expired ? "expired" : data.status, amount: data.amount, paidAmount: data.paid_amount };

    if (data.kind === "key" && data.status === "paid" && t && safeEq(t, data.token)) {
      const { data: items, error: e2 } = await db.from("order_items").select("slug").eq("order_id", data.id);
      if (e2) throw e2;
      const slugs = (items ?? []).map((i) => i.slug);
      const { data: keys, error: e3 } = await db.from("game_keys").select("slug, password").in("slug", slugs);
      if (e3) throw e3;
      const pw = new Map((keys ?? []).map((k) => [k.slug, k.password]));
      out.keys = slugs.map((s) => ({ slug: s, title: games.find((g) => g.slug === s)?.title ?? s, password: pw.get(s) ?? "" }));
    }
    return json(out);
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/orders/[code]", method: "GET" });
    return json({ code: "error" }, 500);
  }
}
