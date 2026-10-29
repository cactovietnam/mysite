"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type Fuse from "fuse.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fold } from "@/lib/library-filter";
import { useModal } from "@/lib/use-modal";
import { usePresence } from "@/lib/use-presence";
import Cover from "./Cover";

// Khớp với src/app/search-index.json/route.ts
type Item = { slug: string; title: string; engine: string; version: string; tags: string[]; thumb: string };
// Trường đã bỏ dấu (tính ở client, không làm nặng search-index.json): gõ "viet hoa" vẫn ra "Việt hóa".
type Row = Item & { _t: string; _g: string[]; _e: string };
type Index = { items: Item[]; fuse: Fuse<Row> };

// Tải chỉ mục + fuse.js đúng một lần, lúc người dùng sắp dùng tìm kiếm (rê chuột / focus / mở). Lỗi thì lần sau thử lại.
let pending: Promise<Index> | null = null;
function loadIndex(): Promise<Index> {
  pending ??= Promise.all([
    import("fuse.js"),
    fetch("/search-index.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Item[]>; }),
  ]).then(([{ default: FuseCtor }, items]) => ({
    items,
    fuse: new FuseCtor<Row>(
      items.map((it) => ({ ...it, _t: fold(it.title), _g: it.tags.map(fold), _e: fold(it.engine) })),
      { keys: ["_t", "_g", "_e"], threshold: 0.35 },
    ),
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
  const results = index ? (q ? index.fuse.search(fold(q)).slice(0, 6).map((r) => r.item) : index.items.slice(0, 5)) : [];

  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    setFailed(false);
    loadIndex().then((x) => { if (alive) setIndex(x); }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [open, index]);
  const warm = () => { loadIndex().catch(() => {}); };

  const close = useCallback(() => setOpen(false), []); // không xóa ô tìm lúc đóng: danh sách không bị nhảy trong lúc mờ dần
  const show = useCallback(() => { setQ(""); setIdx(0); setOpen(true); }, []);
  const { mounted, closing } = usePresence(open);
  const dialogRef = useModal(open, close); // khóa cuộn, nhốt Tab, Esc đóng, trả focus

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); show(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[idx]) { router.push(`/game/${results[idx].slug}`); close(); }
  };

  return (
    <>
      <button onClick={show} onPointerEnter={warm} onFocus={warm} aria-label="Tìm kiếm"
              className="flex h-9 items-center justify-center rounded-lg sm:h-10 border border-[rgba(148,163,184,0.22)] bg-[rgba(30,27,46,0.85)] px-2.5 text-sm text-slate-400 transition hover:border-[#2af5d6]/40 hover:text-white sm:w-44 sm:justify-between xl:w-60 sm:px-4">
        <span className="hidden sm:inline">Tìm kiếm game...</span>
        <span className="flex items-center gap-2">
          <kbd className="hidden rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-haze xl:inline">Ctrl K</kbd>
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" />
          </svg>
        </span>
      </button>

      {mounted && createPortal(
        <div className={`${closing ? "anim-out-fade" : "anim-fade"} fixed inset-0 z-50 flex items-start justify-center bg-ink/85 px-4 pt-[12vh]`} onClick={close}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tìm game"
               className={`glass ${closing ? "anim-out-pop" : "anim-pop"} w-full max-w-xl rounded-[1.75rem] p-3 shadow-2xl shadow-black/50 outline-none`}
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
