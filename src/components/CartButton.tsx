"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { games, thumbOf } from "@/data/games";
import { site } from "@/data/site";
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
const thumbIn = (slug: string) => { const g = games.find((x) => x.slug === slug); return g ? thumbOf(g) : ""; };
const FB = /^https?:\/\//i.test(site.facebook) ? site.facebook : "";
const TTL = 30 * 60; // khớp ORDER_TTL_MIN ở src/lib/payment.ts

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
  const cp = "shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold transition hover:bg-white/20 active:scale-95";
  const step = !order ? 0 : status === "paid" ? 2 : 1;
  const title = status === "paid" && order ? "Thanh toán thành công" : order ? "Chuyển khoản" : "Giỏ hàng";

  const help = FB && (
    <a href={FB} target="_blank" rel="noopener noreferrer"
       className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm transition hover:bg-white/[0.09]">
      <span><b className="block">Chuyển xong mà không nhận được pass?</b><span className="text-xs text-haze">Nhắn Facebook kèm mã đơn <span className="font-mono">{order?.code}</span>, mình xử lý ngay.</span></span>
      <span aria-hidden className="text-lg text-berry">&rarr;</span>
    </a>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Giỏ hàng${cart.length ? `, ${cart.length} game` : ""}`}
              className="relative grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/[0.16] active:scale-95">
        {cartIcon}
        {cart.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-berry px-1 text-[10px] font-bold leading-[1.1rem] text-ink">{cart.length}</span>}
      </button>

      {mounted && createPortal(
        <div className={`${closing ? "anim-out-fade" : "anim-fade"} fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/85 p-4 backdrop-blur-sm`} onClick={() => setOpen(false)}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Giỏ hàng"
               className={`glass ${closing ? "anim-out-pop" : "anim-pop"} relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] p-5 shadow-2xl shadow-black/60 sm:p-6`}
               onClick={(e) => e.stopPropagation()}>
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2af5d6] to-[#ff2e93]" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-berry to-[#7c5cff] text-ink">{cartIcon}</span>
                <div>
                  <h2 className="font-display text-xl font-bold leading-tight tracking-tight">{title}</h2>
                  <p className="text-xs text-haze">{!order ? (cart.length ? `${cart.length} game trong giỏ` : "Key mật khẩu ZIP") : status === "paid" ? "Mật khẩu ZIP đã sẵn sàng" : `Đơn ${order.code}`}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">&times;</button>
            </div>

            <ol aria-label="Các bước" className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
              {["Giỏ hàng", "Chuyển khoản", "Nhận key"].map((s, i) => (
                <li key={s} className="flex flex-1 flex-col gap-1.5">
                  <span className={`h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-gradient-to-r from-[#2af5d6] to-[#ff2e93]" : "bg-white/10"}`} />
                  <span className={i <= step ? "text-mist" : "text-haze/70"}>{s}</span>
                </li>
              ))}
            </ol>

            {/* ---- đã thanh toán: hiện key ---- */}
            {order && status === "paid" && (
              <div role="status" className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9.5" /><path d="m7.5 12.5 3 3 6-6.5" /></svg>
                  <span>Đã nhận <b>{fmt(paid ?? order.amount)}</b>. Mật khẩu ZIP của bạn đây, xem lại được trong giỏ hàng trên trình duyệt này.</span>
                </div>
                {keys.length === 0 && <p className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-haze">Đang lấy key…</p>}
                {keys.map((k) => (
                  <div key={k.slug} className="anim-pop flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumbIn(k.slug) ? <img src={thumbIn(k.slug)} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="size-14 shrink-0 rounded-xl bg-white/10" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-haze">{k.title}</p>
                      <code className="block break-all font-mono text-lg font-bold tracking-wide text-berry">{k.password}</code>
                    </div>
                    <button type="button" onClick={() => copy(k.slug, k.password)} className={cp}>{copied === k.slug ? "Đã chép" : "Chép"}</button>
                  </div>
                ))}
                {keys.length === 0 && help}
                <button type="button" onClick={reset} className="w-full rounded-full bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20 active:scale-95">Xong</button>
              </div>
            )}

            {/* ---- chờ thanh toán ---- */}
            {order && status !== "paid" && (
              <div className="mt-5">
                <div className="rounded-3xl border border-white/10 bg-ink/40 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-haze">Số tiền chính xác</p>
                  <button type="button" onClick={() => copy("amt", String(order.amount))} title="Bấm để chép số tiền"
                          className="mt-1 inline-flex items-center gap-2 font-display text-4xl font-extrabold tabular-nums tracking-tight transition active:scale-95">
                    <span className="bg-gradient-to-r from-[#2af5d6] to-[#ff2e93] bg-clip-text text-transparent">{order.amount.toLocaleString("vi-VN")}đ</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 font-sans text-xs font-semibold text-mist">{copied === "amt" ? "Đã chép" : "Chép"}</span>
                  </button>
                  <div className="relative mx-auto mt-4 w-fit rounded-3xl bg-white p-3 shadow-lg shadow-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.qr} alt={`Mã QR thanh toán ${fmt(order.amount)}`} className={`size-52 object-contain sm:size-60 ${expired ? "opacity-20" : ""}`} />
                    {expired && <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-neutral-700">Mã đã hết hạn</div>}
                  </div>
                  <div className="mx-auto mt-4 h-1.5 w-full max-w-[15rem] overflow-hidden rounded-full bg-white/10" aria-hidden>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#2af5d6] to-[#ff2e93] transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (left / TTL) * 100)}%` }} />
                  </div>
                  <p role="status" aria-live="polite" className="mt-2 flex items-center justify-center gap-2 text-sm text-haze">
                    {expired ? "Đơn hết hạn. Nếu đã chuyển tiền, hệ thống vẫn ghi nhận." :
                      status === "underpaid" ? `Đã nhận ${fmt(paid ?? 0)}, còn thiếu ${fmt(order.amount - (paid ?? 0))}. Chuyển bù đúng số còn thiếu.` :
                      <><span aria-hidden className="size-2 animate-pulse rounded-full bg-[#2af5d6]" />Đang chờ ngân hàng xác nhận · còn <b className="tabular-nums text-mist">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></>}
                  </p>
                </div>

                <dl className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm">
                  {([
                    ["Ngân hàng", order.bank.bankName, null],
                    ["Số tài khoản", order.bank.accountNumber, "acc"],
                    ["Chủ tài khoản", order.bank.accountHolder, null],
                    ["Nội dung", order.code, "code"],
                  ] as const).map(([label, value, k]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-haze">{label}</dt>
                      <dd className="flex items-center gap-2 font-display font-bold tabular-nums">
                        <span className="break-all text-right">{value}</span>
                        {k && <button type="button" onClick={() => copy(k, value)} className={cp}>{copied === k ? "Đã chép" : "Chép"}</button>}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-200">
                  <b>Chuyển đúng từng đồng:</b> mỗi đơn có số tiền riêng (+{order.suffix}đ nhận diện) để hệ thống nhận đúng đơn dù app ngân hàng/MoMo làm mất nội dung. Giữ trang này mở.
                </p>
                {help}
                <button type="button" onClick={reset} className="mt-3 w-full rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95">{expired ? "Quay lại giỏ" : "Hủy, quay lại giỏ"}</button>
              </div>
            )}

            {/* ---- giỏ hàng ---- */}
            {!order && (
              <div className="mt-5">
                {cart.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 px-4 py-10 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/[0.06] text-haze">{cartIcon}</span>
                    <p className="mt-3 font-semibold">Giỏ hàng đang trống</p>
                    <p className="mt-1 text-sm text-haze">Vào trang game và bấm &ldquo;Mua key&rdquo; để thêm.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lines.map(({ slug, p }) => (
                      <li key={slug} className="anim-pop flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {thumbIn(slug) ? <img src={thumbIn(slug)} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="size-14 shrink-0 rounded-xl bg-white/10" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{titleOf(slug)}</span>
                          <span className="block text-xs text-haze">{!p ? (prices.size ? "Ngừng bán key" : "Đang tải giá…") : p.fee > 0 ? `Key ${fmt(p.price)} + phí ${fmt(p.fee)}` : "Key mật khẩu ZIP"}</span>
                        </span>
                        <span className="font-display font-bold tabular-nums">{p ? fmt(p.price + p.fee) : "–"}</span>
                        <button type="button" onClick={() => removeFromCart(slug)} aria-label={`Xóa ${titleOf(slug)} khỏi giỏ`} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-red-500/30 active:scale-95">&times;</button>
                      </li>
                    ))}
                  </ul>
                )}
                {cart.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-haze">Tạm tính</span>
                      <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(total)}</span>
                    </div>
                    <p className="mt-1 text-xs text-haze">Chuyển khoản MB/MoMo, key hiện ngay sau khi nhận tiền (5–30 giây).</p>
                  </div>
                )}
                {err && <p role="alert" className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}
                {cart.length > 0 && (
                  <button type="button" onClick={checkout} disabled={busy || missing || prices.size === 0}
                          className="mt-4 w-full rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? "Đang tạo mã QR…" : `Thanh toán ${fmt(total)}`}
                  </button>
                )}

                {oldList.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="text-sm font-semibold">Key đã mua</h3>
                    <ul className="mt-2 space-y-2">
                      {oldList.flatMap(([code, ks]) => ks.map((k) => (
                        <li key={code + k.slug} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {thumbIn(k.slug) ? <img src={thumbIn(k.slug)} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" /> : <span className="size-12 shrink-0 rounded-xl bg-white/10" />}
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm">{k.title}</span><code className="font-mono text-sm font-bold text-berry">{k.password}</code></span>
                          <button type="button" onClick={() => copy(code + k.slug, k.password)} className={cp}>{copied === code + k.slug ? "Đã chép" : "Chép"}</button>
                        </li>
                      )))}
                    </ul>
                    {FB && <a href={FB} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-haze underline decoration-white/20 underline-offset-4 transition hover:text-mist">Không nhận được pass? Nhắn Facebook</a>}
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
