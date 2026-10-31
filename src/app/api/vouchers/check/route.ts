import { adminClient, sameOrigin } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { games } from "@/data/games";
import { MIN_AMOUNT } from "@/lib/payment";
import { normVoucher, voucherFail } from "@/lib/voucher";

// shortcut: đếm theo từng instance serverless. Chặn chặt hơn /api/orders vì đây là chỗ dò mã voucher.
const hits = new Map<string, { n: number; reset: number }>();
const MAX_PER_MIN = 8;
const MAX_ITEMS = 20;

// POST {code, slugs} -> xem trước giảm giá cho giỏ hiện tại. KHÔNG giữ lượt: lượt chỉ bị giữ khi tạo đơn (/api/orders).
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (hits.size > 1000) hits.clear();
  const h = hits.get(ip);
  if (!h || now > h.reset) hits.set(ip, { n: 1, reset: now + 60_000 });
  else if (++h.n > MAX_PER_MIN) return json({ code: "rate" }, 429);

  let b: { code?: unknown; slugs?: unknown };
  try { b = await req.json(); } catch { return json({ code: "invalid" }, 400); }
  if (!Array.isArray(b.slugs)) return json({ code: "invalid" }, 400);
  const slugs = [...new Set(b.slugs.filter((s): s is string => typeof s === "string"))];
  if (slugs.length === 0 || slugs.length > MAX_ITEMS) return json({ code: "invalid" }, 400);
  const alive = new Set(games.map((g) => g.slug));
  if (slugs.some((s) => !alive.has(s))) return json({ code: "invalid" }, 400);

  const code = normVoucher(b.code);
  if (!code) return json({ code: "voucher_not_found" }, 404);

  try {
    const db = adminClient();
    const { data: rows, error } = await db.from("game_keys").select("slug, price, fee")
      .in("slug", slugs).eq("enabled", true).neq("password", "");
    if (error) throw error;
    if (!rows || rows.length !== slugs.length) return json({ code: "unavailable" }, 409);
    const subtotal = rows.reduce((s, r) => s + r.price + r.fee, 0);

    const { data, error: e2 } = await db.rpc("voucher_quote", { p_code: code, p_subtotal: subtotal, p_min: MIN_AMOUNT });
    if (e2) throw e2;
    const r = data as { ok: boolean; error?: string; code?: string; kind?: string; value?: number; discount?: number; total?: number; free?: boolean };
    if (!r.ok) { const f = voucherFail(r.error); return json({ code: f.code }, f.status); }
    return json({ voucher: r.code, kind: r.kind, value: r.value, discount: r.discount, subtotal, total: r.total, free: !!r.free });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/vouchers/check", method: "POST" });
    return json({ code: "error" }, 500);
  }
}
