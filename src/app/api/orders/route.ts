import { adminClient, sameOrigin } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { games } from "@/data/games";
import { MAX_AMOUNT, MIN_AMOUNT, ORDER_TTL_MIN, bankInfo, newOrderCode, qrUrl } from "@/lib/payment";
import { normVoucher, voucherFail } from "@/lib/voucher";

// shortcut: đếm theo từng instance serverless, chỉ là lưới thô chống spam tạo đơn.
const hits = new Map<string, { n: number; reset: number }>();
const MAX_PER_MIN = 6;
const MAX_ITEMS = 20;

// POST {slugs: string[], voucher?: string} -> đơn mua key (giá + giảm giá tính ở server)   |   POST {amount, note?} -> đơn donate.
// Đăng nhập là tùy chọn: có token hợp lệ thì gắn user_id.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (hits.size > 1000) hits.clear();
  const h = hits.get(ip);
  if (!h || now > h.reset) hits.set(ip, { n: 1, reset: now + 60_000 });
  else if (++h.n > MAX_PER_MIN) return json({ code: "rate" }, 429);

  let b: { amount?: unknown; note?: unknown; slugs?: unknown; voucher?: unknown };
  try { b = await req.json(); } catch { return json({ code: "invalid" }, 400); }

  try {
    const db = adminClient();
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    let userId: string | null = null;
    if (token) userId = (await db.auth.getUser(token)).data.user?.id ?? null;
    const expiresAt = new Date(Date.now() + ORDER_TTL_MIN * 60_000).toISOString();

    // ---------- đơn mua key ----------
    if (Array.isArray(b.slugs)) {
      const slugs = [...new Set(b.slugs.filter((s): s is string => typeof s === "string"))];
      if (slugs.length === 0 || slugs.length > MAX_ITEMS) return json({ code: "invalid" }, 400);
      const alive = new Set(games.map((g) => g.slug));
      if (slugs.some((s) => !alive.has(s))) return json({ code: "invalid" }, 400);

      const { data: rows, error: e1 } = await db.from("game_keys").select("slug, price, fee")
        .in("slug", slugs).eq("enabled", true).neq("password", "");
      if (e1) throw e1;
      if (!rows || rows.length !== slugs.length) return json({ code: "unavailable" }, 409); // có game đã tắt bán / chưa có key
      const subtotal = rows.reduce((s, r) => s + r.price + r.fee, 0);
      if (subtotal < MIN_AMOUNT || subtotal > MAX_AMOUNT) return json({ code: "invalid_amount" }, 400);

      // Dọn đơn hết hạn để số tiền lẻ được dùng lại (chỉ mục UNIQUE theo số tiền của đơn đang chờ).
      await db.from("orders").update({ status: "expired" }).eq("status", "pending").eq("kind", "key").lt("expires_at", new Date().toISOString());

      // Có voucher: hàm SQL create_voucher_order khóa dòng voucher, kiểm lượt, tính giảm và tạo đơn trong MỘT transaction.
      const wantVoucher = b.voucher != null && b.voucher !== "";
      if (wantVoucher) {
        const vcode = normVoucher(b.voucher);
        if (!vcode) return json({ code: "voucher_not_found" }, 404);
        const items = rows.map((r) => ({ slug: r.slug, price: r.price, fee: r.fee }));
        for (let i = 0; i < 12; i++) {
          const suffix = 1 + Math.floor(Math.random() * 999);
          const code = newOrderCode();
          const { data, error } = await db.rpc("create_voucher_order", {
            p_order_code: code, p_suffix: suffix, p_user: userId, p_expires: expiresAt,
            p_voucher: vcode, p_subtotal: subtotal, p_min: MIN_AMOUNT, p_items: items,
          });
          if (error) { if (error.code === "23505") continue; throw error; } // trùng mã/số tiền: transaction đã rollback, thử lại
          const r = data as { ok: boolean; error?: string; token?: string; amount?: number; discount?: number; free?: boolean };
          if (!r.ok) { const f = voucherFail(r.error); return json({ code: f.code }, f.status); }
          const amount = r.amount as number;
          // Voucher giảm hết: đơn đã paid sẵn, không có QR/số lẻ; client lấy key ngay qua GET /api/orders/[code].
          if (r.free) return json({ code, token: r.token, amount: 0, suffix: 0, subtotal, discount: r.discount, free: true, expiresAt, qr: "", bank: bankInfo() });
          return json({ code, token: r.token, amount, suffix, subtotal, discount: r.discount, expiresAt, qr: qrUrl(amount, code), bank: bankInfo() });
        }
        return json({ code: "busy" }, 503);
      }

      for (let i = 0; i < 12; i++) {
        const suffix = 1 + Math.floor(Math.random() * 999);
        const amount = subtotal + suffix;
        const code = newOrderCode();
        const { data: order, error } = await db.from("orders")
          .insert({ code, amount, suffix, kind: "key", user_id: userId, expires_at: expiresAt })
          .select("id, token").single();
        if (error) { if (error.code === "23505") continue; throw error; } // trùng mã hoặc trùng số tiền: thử lại
        const ins = await db.from("order_items").insert(rows.map((r) => ({ order_id: order.id, slug: r.slug, price: r.price, fee: r.fee })));
        if (ins.error) { await db.from("orders").delete().eq("id", order.id); throw ins.error; }
        return json({ code, token: order.token, amount, suffix, subtotal, expiresAt, qr: qrUrl(amount, code), bank: bankInfo() });
      }
      return json({ code: "busy" }, 503);
    }

    // ---------- đơn donate ----------
    const amount = b.amount;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return json({ code: "invalid_amount", min: MIN_AMOUNT, max: MAX_AMOUNT }, 400);
    }
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 100) : "";
    for (let i = 0; i < 5; i++) {
      const code = newOrderCode();
      const { error } = await db.from("orders").insert({ code, amount, note, user_id: userId, kind: "donate", expires_at: expiresAt });
      if (!error) return json({ code, amount, expiresAt, qr: qrUrl(amount, code), bank: bankInfo() });
      if (error.code !== "23505") throw error;
    }
    throw new Error("Không sinh được mã đơn duy nhất");
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/orders", method: "POST" });
    return json({ code: "error" }, 500);
  }
}
