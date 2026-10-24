"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fmtDate } from "@/lib/game-ui";

type Item = { slug: string; title: string; updatedAt: string };
const KEY = "gsvh-notif-seen";
const EVENT = "notif-seen";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
};
const read = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };

// Chuông thông báo: thanh thông báo của site + 3 game mới nhất. Chấm đỏ cho đến khi mở chuông (nhớ ở trình duyệt, không cần tài khoản).
export default function NotificationBell({ notice, items }: { notice: string; items: Item[] }) {
  const stamp = `${notice}|${items.map((i) => i.slug + i.updatedAt).join(",")}`;
  const seen = useSyncExternalStore(subscribe, read, () => stamp); // server coi như đã xem: không lệch hydration
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!notice && items.length === 0) return null;

  const toggle = () => {
    setOpen((o) => !o);
    try { localStorage.setItem(KEY, stamp); } catch { /* chế độ riêng tư: bỏ qua */ }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Thông báo"
              className="relative grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/[0.16] active:scale-95">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />
        </svg>
        {seen !== stamp && <span aria-label="Có thông báo mới" className="absolute right-2 top-2 size-2.5 rounded-full bg-berry ring-2 ring-[#100c20]" />}
      </button>

      {open && (
        <div role="menu" className="anim-pop absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] whitespace-normal rounded-2xl border border-white/10 bg-plum p-2 shadow-2xl shadow-black/50">
          {notice && <p className="px-3 py-2 text-sm leading-relaxed text-mist/85">{notice}</p>}
          {items.length > 0 && <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-haze">Mới cập nhật</p>}
          {items.map((g) => (
            <Link key={g.slug} href={`/game/${g.slug}`} role="menuitem" onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/10">
              <span className="truncate">{g.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-haze">{fmtDate(g.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
