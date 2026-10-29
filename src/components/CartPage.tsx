"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { getSupabase } from "@/lib/supabase";
import { clearCart, rememberOrder, removeFromCart, useCart, usePastOrders } from "@/lib/cart";
import { loadKeyRows, type Price } from "@/lib/key-prices";
import { useGameMeta } from "@/lib/game-meta";

type Order = { code: string; token: string; amount: number; suffix: number; subtotal: number; expiresAt: string; qr: string; bank: { bankName: string; accountNumber: string; accountHolder: string } };
type Key = { slug: string; title: string; password: string };
type Status = "pending" | "paid" | "underpaid" | "expired";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
const FB = /^https?:\/\//i.test(site.facebook) ? site.facebook : "";
const TTL = 30 * 60; // khớp ORDER_TTL_MIN ở src/lib/payment.ts
const ACTIVE = "gsvh-active-order"; // giữ đơn đang chờ khi tải lại trang (sessionStorage, mất khi đóng tab)
const saveActive = (o: Order | null) => { try { if (o) sessionStorage.setItem(ACTIVE, JSON.stringify(o)); else sessionStorage.removeItem(ACTIVE); } catch { /* bỏ qua */ } };

const Cart = ({ cls = "size-5" }: { cls?: string }) => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6" />
  </svg>
);
const cp = "shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold transition hover:bg-white/20 active:scale-95";
const primary = "flex w-full items-center justify-center gap-2 rounded-full bg-berry px-7 py-4 text-base font-semibold text-ink shadow-md shadow-black/30 transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";
const ghost = "w-full rounded-full bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20 active:scale-95";

export default function CartPage() {
  const cart = useCart();
  const past = usePastOrders();
  const meta = useGameMeta();
  const titleOf = (s: string) => meta.get(s)?.title ?? s;
  const thumbOf = (s: string) => meta.get(s)?.thumb ?? "";
  const [prices, setPrices] = useState<Map<string, Price> | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [paid, setPaid] = useState<number | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    loadKeyRows().then((r) => { if (!dead) setPrices(new Map(r.map((x) => [x.slug, x]))); }, () => { if (!dead) { setPrices(new Map()); setErr("Không tải được giá. Thử lại sau ít phút."); } });
    return () => { dead = true; };
  }, []);

  // Tải lại trang giữa lúc đang chờ chuyển khoản: khôi phục QR (nếu đơn chưa hết hạn).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ACTIVE);
      const o = raw ? JSON.parse(raw) as Order : null;
      if (o && Date.parse(o.expiresAt) > Date.now()) setOrder(o);
    } catch { /* bỏ qua */ }
  }, []);

  const lines = cart.map((slug) => ({ slug, p: prices?.get(slug) }));
  const total = lines.reduce((s, l) => s + (l.p ? l.p.price + l.p.fee : 0), 0);
  const missing = !!prices && lines.some((l) => !l.p);

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
      saveActive(body as Order);
      setOrder(body as Order); setStatus("pending"); setPaid(null); setKeys([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setErr("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."); }
    finally { setBusy(false); }
  };

  const reset = useCallback(() => { setOrder(null); setStatus("pending"); setPaid(null); setKeys([]); setErr(null); saveActive(null); }, []);

  // Hỏi trạng thái mỗi 3 giây khi đang chờ; paid thì nhận key và dọn giỏ.
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
          if (d.status === "paid") { setKeys(d.keys ?? []); clearCart(); saveActive(null); return; }
          if (d.status === "expired") return;
        }
      } catch { /* chập chờn mạng: nhịp sau thử lại */ }
      if (!dead) timer.current = setTimeout(tick, 3000);
    };
    timer.current = setTimeout(tick, 1500);
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
  const step = !order ? 0 : status === "paid" ? 2 : 1;

  const help = (
    <>
      {FB && (
        <a href={FB} target="_blank" rel="noopener noreferrer"
           className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left text-sm transition hover:bg-white/[0.09]">
          <span><b className="block">Chuyển xong mà không nhận được pass?</b>
            <span className="text-xs text-haze">Nhắn Facebook{order ? <> kèm mã đơn <span className="font-mono">{order.code}</span></> : null}, mình xử lý ngay.</span></span>
          <span aria-hidden className="text-lg text-berry">&rarr;</span>
        </a>
      )}
    </>
  );

  const thumb = (slug: string, cls: string) => thumbOf(slug)
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={thumbOf(slug)} alt="" loading="lazy" className={`${cls} object-cover`} />
    : <span className={`${cls} grid place-items-center bg-white/10 font-display text-2xl font-bold text-white/40`}>{titleOf(slug).slice(0, 1)}</span>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry">Giỏ hàng</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
        {step === 2 ? "Thanh toán thành công." : step === 1 ? "Chuyển khoản." : cart.length === 0 ? "Giỏ hàng đang trống." : "Giỏ hàng của bạn."}
      </h1>

      <ol aria-label="Các bước" className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider sm:max-w-xl">
        {["Giỏ hàng", "Chuyển khoản", "Nhận key"].map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2">
            <span className={`h-1.5 rounded-full transition-colors duration-500 ${i <= step ? "bg-gradient-to-r from-[#5eead4] to-[#ee5a96]" : "bg-white/10"}`} />
            <span className={i <= step ? "text-mist" : "text-haze/70"}>{s}</span>
          </li>
        ))}
      </ol>

      {/* ---------- BƯỚC 3: đã thanh toán ---------- */}
      {order && status === "paid" && (
        <section role="status" className="mt-10 grid gap-6 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-3">
            {keys.length === 0 ? <p className="glass rounded-3xl px-6 py-10 text-center text-haze">Đang chuẩn bị key…</p> : keys.map((k) => (
              <div key={k.slug} className="anim-pop flex overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
                {thumb(k.slug, "aspect-video w-32 shrink-0 sm:w-56")}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
                  <p className="font-display text-lg font-bold leading-snug sm:text-xl">{k.title}</p>
                  <p className="text-sm text-emerald-300">Key đã sẵn sàng</p>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit space-y-3 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-6 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
              <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5.5 12.5 4.2 4.2 8.8-9.2" /></svg>
            </span>
            <p className="font-display text-2xl font-bold">Đã thanh toán</p>
            <p className="text-sm text-haze">Đã nhận <b className="text-mist">{fmt(paid ?? order.amount)}</b> · đơn <span className="font-mono">{order.code}</span></p>
            <Link href={`/tai-khoan/key?order=${order.code}`} onClick={reset} className={primary}>Hiện key</Link>
            {keys.length === 0 && help}
          </aside>
        </section>
      )}

      {/* ---------- BƯỚC 2: chuyển khoản ---------- */}
      {order && status !== "paid" && (
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-ink/40 p-6 text-center sm:p-8">
            <p className="text-xs uppercase tracking-wider text-haze">Số tiền chính xác</p>
            <button type="button" onClick={() => copy("amt", String(order.amount))} title="Bấm để chép số tiền"
                    className="mt-2 inline-flex flex-wrap items-center justify-center gap-3 font-display text-5xl font-extrabold tabular-nums tracking-tight transition active:scale-95 sm:text-6xl">
              <span className="bg-gradient-to-r from-[#5eead4] to-[#ee5a96] bg-clip-text text-transparent">{order.amount.toLocaleString("vi-VN")}đ</span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-sans text-xs font-semibold text-mist">{copied === "amt" ? "Đã chép" : "Chép"}</span>
            </button>
            <div className="relative mx-auto mt-6 w-fit rounded-3xl bg-white p-4 shadow-xl shadow-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.qr} alt={`Mã QR thanh toán ${fmt(order.amount)}`} className={`size-64 object-contain sm:size-80 ${expired ? "opacity-20" : ""}`} />
              {expired && <div className="absolute inset-0 grid place-items-center text-base font-semibold text-neutral-700">Mã đã hết hạn</div>}
            </div>
            <div className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-gradient-to-r from-[#5eead4] to-[#ee5a96] transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (left / TTL) * 100)}%` }} />
            </div>
            <p role="status" aria-live="polite" className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-haze">
              {expired ? "Đơn hết hạn. Nếu đã chuyển tiền, hệ thống vẫn ghi nhận." :
                status === "underpaid" ? `Đã nhận ${fmt(paid ?? 0)}, còn thiếu ${fmt(order.amount - (paid ?? 0))}. Chuyển bù đúng số còn thiếu.` :
                <><span aria-hidden className="size-2 animate-pulse rounded-full bg-[#5eead4]" />Đang chờ ngân hàng xác nhận · còn <b className="tabular-nums text-mist">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></>}
            </p>
          </div>

          <div className="space-y-4">
            <dl className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.04] px-5 text-sm sm:text-base">
              {([
                ["Ngân hàng", order.bank.bankName, null],
                ["Số tài khoản", order.bank.accountNumber, "acc"],
                ["Chủ tài khoản", order.bank.accountHolder, null],
                ["Nội dung", order.code, "code"],
              ] as const).map(([label, value, k]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3.5">
                  <dt className="text-haze">{label}</dt>
                  <dd className="flex items-center gap-2 font-display font-bold tabular-nums">
                    <span className="break-all text-right">{value}</span>
                    {k && <button type="button" onClick={() => copy(k, value)} className={cp}>{copied === k ? "Đã chép" : "Chép"}</button>}
                  </dd>
                </div>
              ))}
            </dl>

            <ol className="space-y-2 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-haze">
              {["Mở app ngân hàng hoặc MoMo, quét QR hoặc nhập thông tin ở trên.", "Chuyển đúng số tiền và giữ nguyên nội dung.", "Giữ trang này mở: 5–30 giây sau, bước Nhận key sẽ tự hiện."].map((s, i) => (
                <li key={s} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-mist">{i + 1}</span><span className="pt-0.5">{s}</span></li>
              ))}
            </ol>

            <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200 sm:text-sm">
              <b>Chuyển đúng từng đồng:</b> mỗi đơn có số tiền riêng (+{order.suffix}đ nhận diện) để hệ thống nhận đúng đơn dù app ngân hàng/MoMo làm mất nội dung.
            </p>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-haze">Trong đơn</p>
              <ul className="space-y-2">
                {cart.map((s) => (
                  <li key={s} className="flex items-center gap-3">{thumb(s, "size-11 shrink-0 rounded-xl")}<span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{titleOf(s)}</span></li>
                ))}
                {cart.length === 0 && <li className="px-1 text-sm text-haze">{fmt(order.subtotal)}</li>}
              </ul>
            </div>

            {help}
            <button type="button" onClick={reset} className={ghost}>{expired ? "Quay lại giỏ" : "Hủy, quay lại giỏ"}</button>
          </div>
        </section>
      )}

      {/* ---------- BƯỚC 1: giỏ hàng ---------- */}
      {!order && cart.length === 0 && (
        <section className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center sm:py-24">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-white/[0.06] text-haze"><Cart cls="size-9" /></span>
          <p className="mx-auto mt-6 max-w-[40ch] text-lg text-haze">Vào trang một game, bấm &ldquo;Mua key&rdquo;, rồi tiếp tục chọn các game khác.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/#kho-game" className="rounded-full bg-berry px-8 py-3.5 font-semibold text-ink shadow-md shadow-black/30 transition hover:-translate-y-0.5 active:scale-95">Chọn game</Link>
            <Link href="/tai-khoan/key" className="rounded-full bg-white/10 px-8 py-3.5 font-semibold transition hover:bg-white/20 active:scale-95">
              Xem key đã mua{past.length > 0 ? ` (${past.length} đơn)` : ""}
            </Link>
          </div>
        </section>
      )}

      {!order && cart.length > 0 && (
        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
          <ul className="space-y-4">
            {lines.map(({ slug, p }) => (
              <li key={slug} className="anim-pop flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] sm:flex-row">
                {thumb(slug, "aspect-video w-full shrink-0 sm:aspect-auto sm:w-60")}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                  <div>
                    <Link href={`/game/${slug}`} className="font-display text-xl font-bold leading-snug transition hover:text-berry sm:text-2xl">{titleOf(slug)}</Link>
                    <p className="mt-1 text-sm text-haze">{!p ? (prices ? "Ngừng bán key" : "Đang tải giá…") : p.fee > 0 ? `Key ${fmt(p.price)} + phí ${fmt(p.fee)}` : "Key mật khẩu ZIP"}</p>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <button type="button" onClick={() => removeFromCart(slug)} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-red-500/30 active:scale-95">Xóa</button>
                    <span className="font-display text-2xl font-extrabold tabular-nums">{p ? fmt(p.price + p.fee) : "–"}</span>
                  </div>
                </div>
              </li>
            ))}
            <li><Link href="/#kho-game" className="inline-block text-sm text-haze underline decoration-white/20 underline-offset-4 transition hover:text-mist">+ Chọn thêm game khác</Link></li>
          </ul>

          <aside className="glass space-y-4 rounded-3xl p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold">Tóm tắt đơn</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-haze">Số game</dt><dd className="font-semibold">{cart.length}</dd></div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3"><dt className="text-haze">Tạm tính</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{fmt(total)}</dd></div>
            </dl>
            {err && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}
            <button type="button" onClick={checkout} disabled={busy || missing || !prices || prices.size === 0} className={primary}>
              {busy ? "Đang tạo mã QR…" : `Thanh toán ${fmt(total)}`}
            </button>
            <ul className="space-y-1.5 text-xs text-haze">
              <li>• Chuyển khoản MB/MoMo, quét QR là xong.</li>
              <li>• Key hiện ngay sau khi nhận tiền (5–30 giây).</li>
              <li>• Xem lại key ở menu tài khoản &rsaquo; Key đã mua.</li>
            </ul>
            {past.length > 0 && <Link href="/tai-khoan/key" className="block text-center text-sm text-haze underline decoration-white/20 underline-offset-4 transition hover:text-mist">Key đã mua ({past.length} đơn)</Link>}
            {FB && <a href={FB} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-haze underline decoration-white/20 underline-offset-4 transition hover:text-mist">Không nhận được pass? Nhắn Facebook</a>}
          </aside>
        </section>
      )}
    </main>
  );
}
