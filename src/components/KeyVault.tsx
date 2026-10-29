"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePastOrders } from "@/lib/cart";
import { useGameMeta } from "@/lib/game-meta";
import { getSupabase } from "@/lib/supabase";

type K = { slug: string; title: string; password: string };
type Row = { code: string; at: number; keys: K[] };

const fmtDate = (t: number) => new Date(t).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Trang "Key đã mua" (trong phần tài khoản): mỗi game một thẻ có ảnh, tên đầy đủ và mật khẩu ZIP.
// Nguồn: đơn lưu ở trình duyệt này (có token) + đơn gắn với tài khoản đang đăng nhập (xem được trên máy khác).
export default function KeyVault() {
  const past = usePastOrders();
  const meta = useGameMeta();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const sig = useMemo(() => past.map((o) => o.code).join(","), [past]);

  useEffect(() => { setFocus(new URLSearchParams(window.location.search).get("order") ?? ""); }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      const found = new Map<string, Row>();
      await Promise.all(past.map(async (o) => {
        try {
          const r = await fetch(`/api/orders/${o.code}?t=${o.token}`, { cache: "no-store" });
          const d = r.ok ? await r.json() as { keys?: K[] } : null;
          if (d?.keys?.length) found.set(o.code, { code: o.code, at: o.at, keys: d.keys });
        } catch { /* lỗi mạng: bỏ qua đơn này */ }
      }));
      try {
        const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
        if (token) {
          const r = await fetch("/api/orders/mine", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
          const d = r.ok ? await r.json() as { orders: { code: string; paidAt: string | null; keys: K[] }[] } : null;
          for (const o of d?.orders ?? []) if (o.keys.length) found.set(o.code, { code: o.code, at: o.paidAt ? Date.parse(o.paidAt) : found.get(o.code)?.at ?? 0, keys: o.keys });
        }
      } catch { /* chưa đăng nhập hoặc lỗi mạng: chỉ dùng đơn trên máy */ }
      if (!dead) setRows([...found.values()].sort((a, b) => b.at - a.at));
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Đơn vừa thanh toán (?order=...): cuộn tới và mở sẵn key.
  useEffect(() => {
    if (!focus || !rows?.some((r) => r.code === focus)) return;
    setShown((s) => { const n = { ...s }; rows.find((r) => r.code === focus)?.keys.forEach((k) => { n[focus + k.slug] = true; }); return n; });
    document.getElementById(`order-${focus}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus, rows]);

  const copy = async (id: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(id); setTimeout(() => setCopied(null), 1500); }
    catch { window.prompt("Sao chép (Ctrl+C):", v); }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry">Tài khoản</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Key đã mua</h1>
      <p className="mt-3 max-w-[60ch] text-haze">Mật khẩu ZIP của các game bạn đã thanh toán. Lưu theo trình duyệt này; đăng nhập trước khi mua để xem lại trên mọi thiết bị.</p>

      {rows === null ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2" aria-busy>
          {[0, 1].map((i) => <div key={i} className="glass h-72 animate-pulse rounded-3xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass mt-10 grid place-items-center rounded-3xl px-6 py-16 text-center">
          <p className="font-display text-xl font-bold">Chưa có key nào</p>
          <p className="mt-2 max-w-[44ch] text-sm text-haze">Vào trang game, bấm &ldquo;Mua key&rdquo;. Sau khi thanh toán xong, key sẽ hiện ở đây.</p>
          <Link href="/#kho-game" className="mt-6 rounded-full bg-berry px-6 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 active:scale-95">Xem kho game</Link>
        </div>
      ) : rows.map((o) => (
        <section key={o.code} id={`order-${o.code}`} className="mt-10 scroll-mt-24">
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-sm text-haze">
            <span className="font-mono font-semibold text-mist">{o.code}</span>
            {o.at > 0 && <span>{fmtDate(o.at)}</span>}
            {o.code === focus && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Vừa thanh toán</span>}
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {o.keys.map((k) => {
              const id = o.code + k.slug, g = meta.get(k.slug), on = !!shown[id];
              return (
                <li key={id} className={`glass anim-pop overflow-hidden rounded-3xl ${o.code === focus ? "ring-2 ring-emerald-400/40" : ""}`}>
                  <div className="relative aspect-video bg-plum">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {g?.thumb ? <img src={g.thumb} alt={k.title} loading="lazy" className="size-full object-cover" /> : <div className="grid size-full place-items-center font-display text-5xl font-bold text-white/30">{k.title.slice(0, 1)}</div>}
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                  </div>
                  <div className="p-4">
                    <Link href={`/game/${k.slug}`} className="font-display text-lg font-bold leading-snug transition hover:text-berry">{k.title}</Link>
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-ink/50 p-1.5 pl-4">
                      <code className="min-w-0 flex-1 break-all font-mono text-base font-bold tracking-wide text-berry">{on ? k.password || "(chưa có)" : "••••••••••"}</code>
                      <button type="button" onClick={() => setShown((s) => ({ ...s, [id]: !on }))} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20 active:scale-95">{on ? "Ẩn" : "Hiện key"}</button>
                      <button type="button" onClick={() => copy(id, k.password)} disabled={!k.password} className="shrink-0 rounded-full bg-berry px-3 py-1.5 text-xs font-semibold text-ink transition hover:brightness-110 active:scale-95 disabled:opacity-40">{copied === id ? "Đã chép" : "Chép"}</button>
                    </div>
                    <Link href={`/game/${k.slug}`} className="mt-3 inline-block text-xs text-haze underline decoration-white/20 underline-offset-4 transition hover:text-mist">Mở trang tải game</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
