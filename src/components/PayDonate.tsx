"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Order = { code: string; amount: number; expiresAt: string; qr: string; bank: { bankName: string; accountNumber: string; accountHolder: string } };
type Status = "pending" | "paid" | "underpaid" | "expired";

const PRESETS = [10000, 20000, 50000, 100000];
const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

// Donate có QR riêng cho từng đơn: số tiền + nội dung (mã đơn) đã gắn sẵn trong QR, trang tự nhận khi tiền vào tài khoản.
export default function PayDonate() {
  const [amount, setAmount] = useState(20000);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [paid, setPaid] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const create = async () => {
    if (busy) return;
    const value = custom ? Number(custom.replace(/\D/g, "")) : amount;
    if (!Number.isInteger(value) || value < 1000) { setErr("Số tiền tối thiểu 1.000đ."); return; }
    setBusy(true); setErr(null);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount: value, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body.code === "rate" ? "Bạn thao tác quá nhanh, đợi một lúc rồi thử lại." : body.code === "invalid_amount" ? "Số tiền không hợp lệ (1.000đ đến 5.000.000đ)." : "Không tạo được đơn. Thử lại sau ít phút.");
        return;
      }
      setOrder(body as Order); setStatus("pending"); setPaid(null);
    } catch {
      setErr("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    } finally { setBusy(false); }
  };

  // Polling mỗi 3s trong lúc chờ; dừng khi đã paid/expired. underpaid vẫn poll tiếp (khách có thể chuyển bù).
  useEffect(() => {
    if (!order || status === "paid" || status === "expired") return;
    let dead = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/orders/${order.code}`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json() as { status: Status; paidAmount: number | null };
          if (dead) return;
          setStatus(d.status); setPaid(d.paidAmount);
          if (d.status === "paid" || d.status === "expired") return;
        }
      } catch { /* mạng chập chờn: thử lại nhịp sau */ }
      if (!dead) timer.current = setTimeout(tick, 3000);
    };
    timer.current = setTimeout(tick, 3000);
    return () => { dead = true; if (timer.current) clearTimeout(timer.current); };
  }, [order, status]);

  // Đồng hồ đếm ngược hết hạn.
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
  const reset = () => { setOrder(null); setStatus("pending"); setPaid(null); setErr(null); };

  const field = "w-full rounded-xl bg-white/[0.07] px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-haze focus:bg-white/10 focus-visible:ring-2 focus-visible:ring-berry";

  if (!order) {
    return (
      <section className="glass anim-pop mx-auto mt-8 max-w-2xl rounded-[2rem] p-6 shadow-2xl shadow-black/50 sm:p-8">
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Ủng hộ nhanh bằng QR</h2>
        <p className="mt-1 text-sm text-haze">Chọn số tiền, quét mã QR bằng app ngân hàng. Hệ thống tự xác nhận trong vài giây.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((v) => {
            const on = !custom && amount === v;
            return (
              <button key={v} type="button" aria-pressed={on} onClick={() => { setAmount(v); setCustom(""); }}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition active:scale-95 ${on ? "border-transparent bg-berry text-ink" : "border-white/15 bg-white/[0.05] hover:bg-white/10"}`}>
                {fmt(v)}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Hoặc nhập số tiền khác" aria-label="Số tiền khác" className={field} />
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="Tên bạn / game muốn dịch (không bắt buộc)" aria-label="Ghi chú" className={field} />
        </div>

        {err && <p role="alert" className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}
        <button type="button" onClick={create} disabled={busy}
                className="mt-5 w-full rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-md shadow-black/30 transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Đang tạo mã QR…" : "Tạo mã QR"}
        </button>
      </section>
    );
  }

  if (status === "paid") {
    return (
      <section role="status" className="glass anim-pop mx-auto mt-8 max-w-2xl rounded-[2rem] p-8 text-center shadow-2xl shadow-black/50">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <svg viewBox="0 0 20 20" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold">Đã nhận {fmt(paid ?? order.amount)}</h2>
        <p className="mt-2 text-haze">Cảm ơn bạn đã ủng hộ GSVH! Mã đơn: <b className="text-mist">{order.code}</b></p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95">Ủng hộ thêm</button>
      </section>
    );
  }

  const expired = status === "expired" || left === 0;
  const rows = [
    ["Ngân hàng", order.bank.bankName, "bank"],
    ["STK", order.bank.accountNumber, "acc"],
    ["Số tiền", String(order.amount), "amt"],
    ["Nội dung", order.code, "code"],
  ] as const;

  return (
    <section className="glass anim-pop mx-auto mt-8 max-w-2xl rounded-[2rem] p-6 text-center shadow-2xl shadow-black/50 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Quét mã để thanh toán {fmt(order.amount)}</h2>
      <div className="relative mx-auto mt-5 w-fit rounded-3xl bg-white p-4 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={order.qr} alt={`Mã QR thanh toán ${fmt(order.amount)}, nội dung ${order.code}`} className={`size-60 object-contain sm:size-64 ${expired ? "opacity-20" : ""}`} />
        {expired && <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-neutral-700">Mã đã hết hạn</div>}
      </div>

      <p role="status" aria-live="polite" className="mt-4 text-sm text-haze">
        {expired ? "Đơn đã hết hạn. Nếu bạn đã chuyển tiền, hệ thống vẫn sẽ ghi nhận." :
          status === "underpaid" ? `Đã nhận ${fmt(paid ?? 0)}, còn thiếu ${fmt(order.amount - (paid ?? 0))}. Vui lòng chuyển bù với đúng nội dung.` :
          <>Đang chờ thanh toán… còn <b className="tabular-nums text-mist">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></>}
      </p>

      <dl className="mx-auto mt-5 max-w-lg divide-y divide-white/10 rounded-2xl border border-white/10 bg-ink/40 px-5 text-left">
        {rows.map(([label, value, k]) => (
          <div key={k} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 py-3">
            <dt className="text-sm text-haze">{label}</dt>
            <dd className="break-all font-display text-sm font-bold tracking-wide text-berry tabular-nums">{k === "amt" ? fmt(Number(value)) : value}</dd>
            <button type="button" onClick={() => copy(k, value)} className="rounded-full bg-white/10 px-3 py-1 text-xs transition hover:bg-white/20">{copied === k ? "Đã chép" : "Chép"}</button>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-haze">Chuyển đúng số tiền và nội dung để được duyệt tự động.</p>

      <button type="button" onClick={reset} className="mt-5 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95">
        {expired ? "Tạo mã mới" : "Hủy, đổi số tiền"}
      </button>
    </section>
  );
}
