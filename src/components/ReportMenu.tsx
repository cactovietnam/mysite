"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/data/site";
import { useModal } from "@/lib/use-modal";

const ok = (u: string) => /^https?:\/\//i.test(u);

// Logo: đường dẫn SVG của simple-icons (CC0); nền theo màu thương hiệu.
const LOGO = {
  discord: { color: "#5865F2", d: "M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 13 13 0 0 0-.617-1.25.08.08 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.1.1 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.08.08 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13 13 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10 10 0 0 0 .372-.292.07.07 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.07.07 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.08.08 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.08.08 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03M8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418" },
  facebook: { color: "#1877F2", d: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a9 9 0 0 1 1.141.195v3.325a9 9 0 0 0-.653-.036 27 27 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.7 1.7 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647" },
} as const;

function Logo({ id, className }: { id: keyof typeof LOGO; className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d={LOGO[id].d} /></svg>;
}

type Opt = { id: keyof typeof LOGO; name: string; url: string; note: string };

// Nút "Báo lỗi": bấm vào hiện 2 lựa chọn Discord / Facebook (link lấy từ site.json, trống thì ẩn lựa chọn đó).
// variant "tile": ô trong Khám phá nhanh. "pill": nút ở trang game.
export default function ReportMenu({ variant, game }: { variant: "tile" | "pill"; game?: string }) {
  const [open, setOpen] = useState(false);
  const modalRef = useModal(open, () => setOpen(false)); // khóa cuộn, nhốt Tab, Esc đóng, trả focus

  const opts = [
    ok(site.discord) && { id: "discord", name: site.nav.discord, url: site.discord, note: "Báo link lỗi, nhận tin game mới" },
    ok(site.facebook) && { id: "facebook", name: site.nav.facebook, url: site.facebook, note: "Báo link lỗi, hỗ trợ trực tiếp" },
  ].filter((o): o is Opt => !!o);
  if (opts.length === 0) return null;

  return (
    <>
      {variant === "tile" ? (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                className="group relative flex h-full w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 px-5 py-4 text-left transition duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, rgba(88,101,242,0.34), rgba(24,119,242,0.2)), rgba(30,24,56,0.84)" }}>
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold tracking-tight">Báo lỗi</span>
            <span className="mt-0.5 block text-xs leading-snug text-mist/75">Qua {opts.map((o) => o.name).join(" hoặc ")}</span>
          </span>
          <span className="flex shrink-0 -space-x-2">
            {opts.map((o) => (
              <span key={o.id} className="grid size-8 place-items-center rounded-full text-white ring-2 ring-[#1b1535]" style={{ background: LOGO[o.id].color }}>
                <Logo id={o.id} className="size-4" />
              </span>
            ))}
          </span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                className="glass rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">
          Báo lỗi
        </button>
      )}

      {open && createPortal(
        <div className="anim-fade fixed inset-0 z-50 grid place-items-center bg-ink/75 p-4 md:backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Báo lỗi"
               className="glass anim-pop w-full max-w-md rounded-[2rem] p-5 shadow-2xl shadow-black/50"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 px-1">
              <div>
                <h2 className="font-display text-xl font-bold leading-tight">Báo lỗi</h2>
                <p className="mt-1 text-sm text-haze">
                  {game ? `Nhắn cho admin kèm tên game “${game}” và link bị lỗi.` : "Chọn nơi nhắn cho admin, kèm tên game và link bị lỗi."}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Đóng"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">&times;</button>
            </div>
            <ul className="mt-4 space-y-2">
              {opts.map((o) => (
                <li key={o.id}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                     className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 transition duration-300 hover:translate-x-1 hover:bg-white/[0.12]">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: LOGO[o.id].color }}>
                      <Logo id={o.id} className="size-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{o.name}</span>
                      <span className="block text-xs text-haze">{o.note}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
