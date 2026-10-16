"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type Fuse from "fuse.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModal } from "@/lib/use-modal";
import Cover from "./Cover";

// Khớp với src/app/search-index.json/route.ts
type Item = { slug: string; title: string; engine: string; version: string; tags: string[]; thumb: string };
type Index = { items: Item[]; fuse: Fuse<Item> };

// Tải chỉ mục + fuse.js đúng một lần, lúc người dùng sắp dùng tìm kiếm (rê chuột / focus / mở). Lỗi thì lần sau thử lại.
let pending: Promise<Index> | null = null;
function loadIndex(): Promise<Index> {
  pending ??= Promise.all([
    import("fuse.js"),
    fetch("/search-index.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Item[]>; }),
  ]).then(([{ default: FuseCtor }, items]) => ({
    items,
    fuse: new FuseCtor(items, { keys: ["title", "tags", "engine"], threshold: 0.35 }),
  })).catch((e) => { pending = null; throw e; });
  return pending;
}

export default function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const results = index ? (q ? index.fuse.search(q).slice(0, 6).map((r) => r.item) : index.items.slice(0, 5)) : [];

  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    setFailed(false);
    loadIndex().then((x) => { if (alive) setIndex(x); }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [open, index]);
  const warm = () => { loadIndex().catch(() => {}); };

  const close = useCallback(() => { setOpen(false); setQ(""); setIdx(0); }, []);
  const dialogRef = useModal(open, close); // khóa cuộn, nhốt Tab, Esc đóng, trả focus

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[idx]) { router.push(`/game/${results[idx].slug}`); close(); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} onPointerEnter={warm} onFocus={warm} aria-label="Tìm kiếm"
              className="flex h-10 items-center gap-2.5 rounded-full bg-white/10 px-4 text-sm text-mist/90 transition hover:bg-white/[0.16]">
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" />
        </svg>
        <span className="hidden sm:inline">Tìm kiếm</span>
        <kbd className="hidden rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-haze md:inline">Ctrl K</kbd>
      </button>

      {open && createPortal(
        <div className="anim-fade fixed inset-0 z-50 flex items-start justify-center bg-ink/70 px-4 pt-[12vh] md:backdrop-blur-sm" onClick={close}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tìm game"
               className="glass anim-pop w-full max-w-xl rounded-[1.75rem] p-3 shadow-2xl shadow-black/50 outline-none"
               onClick={(e) => e.stopPropagation()}>
            <input data-autofocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onInputKey}
                   placeholder="Tìm theo tên, tag hoặc engine"
                   className="w-full rounded-2xl bg-white/[0.07] px-5 py-3.5 text-lg outline-none placeholder:text-haze focus:bg-white/10" />
            <ul className="mt-2 space-y-1">
              {results.map((g, i) => (
                <li key={g.slug}>
                  <Link href={`/game/${g.slug}`} onClick={close} onMouseEnter={() => setIdx(i)}
                        className={`flex items-center gap-3.5 rounded-2xl p-2 transition ${i === idx ? "bg-white/10" : ""}`}>
                    <Cover src={g.thumb} title={g.title} engine={g.engine} className="h-14 w-11 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{g.title}</span>
                      <span className="block text-xs text-haze">{g.engine}, v{g.version}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {open && !index && (
                <li role="status" className="px-4 py-6 text-center text-sm text-haze">
                  {failed ? "Không tải được dữ liệu tìm kiếm. Kiểm tra mạng rồi mở lại." : "Đang tải…"}
                </li>
              )}
              {index && q && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-haze">Không có game nào khớp với &ldquo;{q}&rdquo;. Thử tên khác hoặc một tag.</li>
              )}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
