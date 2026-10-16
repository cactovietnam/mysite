"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/lib/use-modal";
import type { Game } from "@/data/games";
import { providerOf } from "@/lib/game-ui";

// Nút "Tải xuống": bấm vào hiện bảng các link (Gofile, Drive, MEGA...)
export default function DownloadPanel({ links, title }: { links: Game["links"]; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const safe = links.filter((l) => /^https?:\/\//i.test(l.url)); // chỉ nhận http/https

  const modalRef = useModal(open, () => setOpen(false)); // khóa cuộn, nhốt Tab, Esc đóng, trả focus

  // Popup mở: header nổi lên trên lớp phủ (CSS ở globals.css, theo thuộc tính data-dl-open).
  // Bấm vào header thì đóng popup, tránh hai hộp thoại (vd Tìm kiếm) cùng mở và tranh focus/Esc.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute("data-dl-open", "");
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("#site-header")) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      root.removeAttribute("data-dl-open"); // cũng chạy khi chuyển trang lúc popup đang mở
    };
  }, [open]);

  if (safe.length === 0) {
    return <p className="rounded-full bg-white/10 px-6 py-3 text-haze">Chưa có link tải cho game này.</p>;
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("Sao chép link (Ctrl+C):", url); // trình duyệt chặn clipboard: cho người dùng chép tay
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
              className="group inline-flex items-center gap-3 rounded-full bg-accent py-2.5 pl-7 pr-2.5 font-semibold text-on-accent shadow-[0_14px_36px_-12px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_var(--accent)] active:scale-95">
        Tải xuống
        <span className="grid size-9 place-items-center rounded-full bg-ink/15 transition duration-300 group-hover:translate-y-0.5 group-hover:bg-ink/25">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3v10m0 0-4-4m4 4 4-4M4 17h12" />
          </svg>
        </span>
      </button>

      {open && createPortal(
        <div className="anim-fade fixed inset-0 z-50 grid place-items-center bg-ink/75 p-4 md:backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Link tải ${title}`}
               className="glass anim-pop w-full max-w-md rounded-[2rem] p-5 shadow-2xl shadow-black/50"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 px-1">
              <div>
                <h2 className="font-display text-xl font-bold leading-tight">Tải {title}</h2>
                <p className="mt-1 text-sm text-haze">Chọn một nơi tải. Link nào lỗi thì thử link khác.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Đóng"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">&times;</button>
            </div>

            <ul className="mt-4 space-y-2">
              {safe.map((l, i) => {
                const p = providerOf(l.url);
                const sub = l.label && l.label !== p.name ? l.label : p.host;
                return (
                  <li key={l.url} className="anim-rise flex items-center gap-1 rounded-2xl bg-white/[0.06] transition duration-300 hover:translate-x-1 hover:bg-white/[0.12]"
                      style={{ "--d": `${80 + i * 60}ms` } as React.CSSProperties}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 p-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl font-display text-lg font-bold"
                            style={{ background: `${p.color}26`, color: p.color }}>{p.name.slice(0, 1)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-haze">{sub}</span>
                      </span>
                    </a>
                    <button onClick={() => copy(l.url)} aria-label={`Sao chép link ${p.name}`}
                            className="mr-3 shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20">
                      {copied === l.url ? "Đã chép" : "Sao chép"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
