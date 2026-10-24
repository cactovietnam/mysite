"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/data/site";
import { useModal } from "@/lib/use-modal";
import { LOGO } from "@/lib/logos";

const ok = (u: string) => /^https?:\/\//i.test(u);


function Logo({ id, className }: { id: keyof typeof LOGO; className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d={LOGO[id].d} /></svg>;
}

type Opt = { id: keyof typeof LOGO; name: string; url: string; note: string };

// Nút "Báo lỗi": bấm vào hiện 2 lựa chọn Discord / Facebook (link lấy từ site.json, trống thì ẩn lựa chọn đó).
// variant "tile": chip trong Khám phá nhanh, 2 icon bấm thẳng tới Discord/Facebook (không qua popup).
// variant "pill": nút ở trang game, vẫn mở popup để nhắc kèm tên game + link lỗi.
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
        <div className="glass flex items-center gap-2 rounded-full py-1 pl-4 pr-1">
          <span className="text-sm text-haze">Báo lỗi</span>
          {opts.map((o) => (
            <a key={o.id} href={o.url} target="_blank" rel="noopener noreferrer"
               aria-label={`Báo lỗi qua ${o.name}`} title={o.name}
               className="grid size-8 place-items-center rounded-full text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
               style={{ background: LOGO[o.id].color }}>
              <Logo id={o.id} className="size-4" />
            </a>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                className="glass rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">
          Báo lỗi
        </button>
      )}

      {variant === "pill" && open && createPortal(
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
