"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { games } from "@/data/games";
import { useModal } from "@/lib/use-modal";
import { usePresence } from "@/lib/use-presence";
import { getSupabase } from "@/lib/supabase";
import { clearCart, rememberOrder, removeFromCart, useCart, usePastOrders } from "@/lib/cart";

type Price = { slug: string; price: number; fee: number };
type Order = { code: string; token: string; amount: number; suffix: number; subtotal: number; expiresAt: string; qr: string; bank: { bankName: string; accountNumber: string; accountHolder: string } };
type Key = { slug: string; title: string; password: string };
type Status = "pending" | "paid" | "underpaid" | "expired";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
const titleOf = (slug: string) => games.find((g) => g.slug === slug)?.title ?? slug;

// Giá key (công khai) tải một lần, dùng chung cho nút "Mua key" và giỏ. Lỗi thì lần sau tải lại.
let pricePromise: Promise<Map<string, number>> | null = null;
let priceRows: Price[] = [];
export function loadKeyPrices(): Promise<Map<string, number>> {
  pricePromise ??= fetch("/api/keys", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ items: Price[] }>; })
    .then((d) => { priceRows = d.items; return new Map(d.items.map((i) => [i.slug, i.price + i.fee])); })
    .catch((e) => { pricePromise = null; throw e; });
  return pricePromise;
}

const cartIcon = (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6" />
  </svg>
);

// Nút giỏ hàng trên header + hộp thoại: giỏ -> QR thanh toán -> hiện key.
export default function CartButton() {
  const cart = useCart();
  const past = usePastOrders();
  const [open, setOpen] = useState(false);
  const { mounted, closing } = usePresence(open);
  const modalRef = useModal(open, () => setOpen(false));
  const [prices, setPrices] = useState<Map<string, Price>>(new Map());
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [paid, setPaid] = useState<number | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [oldKeys, setOldKeys] = useState<Record<string, Key[]>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("cart-open", on);
    return () => window.removeEventListener("cart-open", on);
  }, []);

  // Mở giỏ: tải giá + xem lại key của các đơn đã tạo (đơn đã trả tiền mới có key).
  useEffect(() => {
    if (!open) return;
    let dead = false;
    loadKeyPrices().then(() => { if (!dead) setPrices(new Map(priceRows.map((r) => [r.slug, r]))); }, () => { if (!dead) setErr("Không tải được giá. Thử lại sau ít phút."); });
    (async () => {
      const found: Record<string, Key[]> = {};
      for (const o of past.slice(0, 10)) {
        if (order?.code === o.code) continue;
        try {
          const r = await fetch(`/api/orders/${o.code}?t=${o.token}`, { cache: "no-store" });
          const d = r.ok ? await r.json() as { keys?: Key[] } : null;
          if (d?.keys?.length) found[o.code] = d.keys;
        } catch { /* bỏ qua đơn lỗi mạng */ }
      }
      if (!dead) setOldKeys(found);
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lines = cart.map((slug) => ({ slug, p: prices.get(slug) }));
  const total = lines.reduce((s, l) => s + (l.p ? l.p.price + l.p.fee : 0), 0);
  const missing = lines.some((l) => !l.p) && prices.size > 0;

  const checkout = async () => {
    if (busy || cart.length === 0) return;
    setBusy(true); setErr(null);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ slugs: cart }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body.code === "unavailable" ? "Có game trong giỏ đã ngừng bán key. Hãy xóa nó khỏi giỏ." :
          body.code === "rate" ? "Bạn thao tác quá nhanh, đợi một lúc rồi thử lại." :
          body.code === "busy" ? "Hệ thống đang bận, thử lại sau vài giây." : "Không tạo được đơn. Thử lại sau ít phút.");
        return;
      }
      rememberOrder({ code: body.code, token: body.token });
      setOrder(body as Order); setStatus("pending"); setPaid(null); setKeys([]);
    } catch { setErr("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."); }
    finally { setBusy(false); }
  };

  const reset = useCallback(() => { setOrder(null); setStatus("pending"); setPaid(null); setKeys([]); setErr(null); }, []);

  // Polling 3s khi đang chờ; paid thì nhận key và dọn giỏ.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!order || status === "paid" || status === "expired") return;
    let dead = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/orders/${order.code}?t=${order.token}`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json() as { status: Status; paidAmount: number | null; keys?: Key[] };
          if (dead) return;
          setStatus(d.status); setPaid(d.paidAmount);
          if (d.status === "paid") { setKeys(d.keys ?? []); clearCart(); return; }
          if (d.status === "expired") return;
        }
      } catch { /* chập chờn mạng: nhịp sau thử lại */ }
      if (!dead) timer.current = setTimeout(tick, 3000);
    };
    timer.current = setTimeout(tick, 2000);
    return () => { dead = true; if (timer.current) clearTimeout(timer.current); };
  }, [order, status]);

  useEffect(() => {
    if (!order || status === "paid") return;
    const upd = () => setLeft(Math.max(0, Math.floor((Date.parse(order.expiresAt) - Date.now()) / 1000)));
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, [order, status]);

  const copy = async (k: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); }
    catch { window.prompt("Sao chép (Ctrl+C):", v); }
  };

  const expired = !!order && (status === "expired" || left === 0);
  const oldList = Object.entries(oldKeys);
  const cp = "rounded-full bg-white/10 px-3 py-1 text-xs transition hover:bg-white/20";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Giỏ hàng${cart.length ? `, ${cart.length} game` : ""}`}
              className="relative grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/[0.16] active:scale-95">
        {cartIcon}
        {cart.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-berry px-1 text-[10px] font-bold leading-[1.1rem] text-ink">{cart.length}</span>}
      </button>

      {mounted && createPortal(
        <div className={`${closing ? "anim-out-fade" : "anim-fade"} fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/85 p-4`} onClick={() => setOpen(false)}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Giỏ hàng"
               className={`glass ${closing ? "anim-out-pop" : "anim-pop"} my-auto w-full max-w-lg rounded-[2rem] p-5 shadow-2xl shadow-black/50 sm:p-6`}
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-2xl font-bold tracking-tight">{status === "paid" && order ? "Thanh toán thành công" : order ? "Quét QR để thanh toán" : "Giỏ hàng"}</h2>
              <button onClick={() => setOpen(false)} aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">&times;</button>
            </div>

            {/* ---- đã thanh toán: hiện key ---- */}
            {order && status === "paid" && (
              <div role="status" className="mt-4 space-y-3">
                <p className="text-sm text-haze">Đã nhận {fmt(paid ?? order.amount)}. Đây là mật khẩu ZIP của bạn (cũng xem lại được trong giỏ hàng trên trình duyệt này):</p>
                {keys.length === 0 && <p className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-haze">Đang lấy key…</p>}
                {keys.map((k) => (
                  <div key={k.slug} className="rounded-2xl bg-white/[0.06] p-4">
                    <p className="truncate text-sm text-haze">{k.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <code className="break-all font-mono text-lg font-bold tracking-wide text-berry">{k.password}</code>
                      <button type="button" onClick={() => copy(k.slug, k.password)} className={cp}>{copied === k.slug ? "Đã chép" : "Chép"}</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={reset} className="w-full rounded-full bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20 active:scale-95">Xong</button>
              </div>
            )}

            {/* ---- chờ thanh toán: QR ---- */}
            {order && status !== "paid" && (
              <div className="mt-4 text-center">
                <div className="relative mx-auto w-fit rounded-3xl bg-white p-4 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.qr} alt={`Mã QR thanh toán ${fmt(order.amount)}`} className={`size-56 object-contain sm:size-64 ${expired ? "opacity-20" : ""}`} />
                  {expired && <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-neutral-700">Mã đã hết hạn</div>}
                </div>
                <p role="status" aria-live="polite" className="mt-3 text-sm text-haze">
                  {expired ? "Đơn đã hết hạn. Nếu bạn đã chuyển tiền, hệ thống vẫn sẽ ghi nhận." :
                    status === "underpaid" ? `Đã nhận ${fmt(paid ?? 0)}, còn thiếu ${fmt(order.amount - (paid ?? 0))}. Chuyển bù đúng số còn thiếu.` :
                    <>Đang chờ ngân hàng xác nhận… còn <b className="tabular-nums text-mist">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></>}
                </p>
                <dl className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-ink/40 px-4 text-left text-sm">
                  {([
                    ["Ngân hàng", order.bank.bankName, null],
                    ["Số tài khoản", order.bank.accountNumber, "acc"],
                    ["Chủ tài khoản", order.bank.accountHolder, null],
                    ["Số tiền chính xác", fmt(order.amount), "amt"],
                    ["Nội dung", order.code, "code"],
                  ] as const).map(([label, value, k]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-haze">{label}</dt>
                      <dd className="flex items-center gap-2 font-display font-bold tabular-nums">
                        <span className="break-all text-right">{value}</span>
                        {k && <button type="button" onClick={() => copy(k, k === "amt" ? String(order.amount) : value)} className={cp}>{copied === k ? "Đã chép" : "Chép"}</button>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-200">
                  <b>Chuyển đúng đến từng đồng ({fmt(order.amount)}):</b> mỗi đơn có một số tiền riêng (gồm +{order.suffix}đ nhận diện) để hệ thống nhận đúng đơn kể cả khi app ngân hàng làm mất nội dung. Không đóng trang này.
                </p>
                <button type="button" onClick={reset} className="mt-4 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95">{expired ? "Quay lại giỏ" : "Hủy, quay lại giỏ"}</button>
              </div>
            )}

            {/* ---- giỏ hàng ---- */}
            {!order && (
              <div className="mt-4">
                {cart.length === 0 ? (
                  <p className="rounded-2xl bg-white/[0.06] px-4 py-8 text-center text-sm text-haze">Giỏ hàng trống. Vào trang game và bấm &ldquo;Mua key&rdquo; để thêm.</p>
                ) : (
                  <ul className="space-y-2">
                    {lines.map(({ slug, p }) => (
                      <li key={slug} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{titleOf(slug)}</span>
                          <span className="block text-xs text-haze">{!p ? (prices.size ? "Ngừng bán key" : "Đang tải giá…") : p.fee > 0 ? `Key ${fmt(p.price)} + phí ${fmt(p.fee)}` : "Key mật khẩu ZIP"}</span>
                        </span>
                        <span className="font-display font-bold tabular-nums">{p ? fmt(p.price + p.fee) : "–"}</span>
                        <button type="button" onClick={() => removeFromCart(slug)} aria-label={`Xóa ${titleOf(slug)} khỏi giỏ`} className="grid size-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">&times;</button>
                      </li>
                    ))}
                  </ul>
                )}
                {cart.length > 0 && (
                  <div className="mt-4 flex items-baseline justify-between px-1">
                    <span className="text-haze">Tạm tính</span>
                    <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(total)}</span>
                  </div>
                )}
                {err && <p role="alert" className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}
                {cart.length > 0 && (
                  <button type="button" onClick={checkout} disabled={busy || missing || prices.size === 0}
                          className="mt-4 w-full rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? "Đang tạo mã QR…" : "Thanh toán"}
                  </button>
                )}

                {oldList.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="text-sm font-semibold">Key đã mua</h3>
                    <ul className="mt-2 space-y-2">
                      {oldList.flatMap(([code, ks]) => ks.map((k) => (
                        <li key={code + k.slug} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                          <span className="min-w-0"><span className="block truncate text-sm">{k.title}</span><code className="font-mono text-sm font-bold text-berry">{k.password}</code></span>
                          <button type="button" onClick={() => copy(code + k.slug, k.password)} className={cp}>{copied === code + k.slug ? "Đã chép" : "Chép"}</button>
                        </li>
                      )))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
