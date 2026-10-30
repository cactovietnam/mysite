"use client";
import { useState } from "react";
import { site } from "@/data/site";
import { LOGO } from "@/lib/logos";
import { useModal } from "@/lib/use-modal";
import { useAgeOk } from "./AgeGate";

// Bảng thông báo của admin: hiện MỖI LẦN vào web (tải lại trang thì hiện lại, chuyển trang trong web thì không).
// Sửa ở quan_ly.py > mục 7 > [1] (site.json -> popup). Thông báo game mới chỉ đi qua chuông, không qua bảng này.
const cfg = (site as unknown as { popup?: { enabled?: boolean; title?: string; text?: string } }).popup;
const text = (cfg?.text ?? "").trim();
const title = (cfg?.title ?? "").trim() || "Thông báo";
const isUrl = (u: string) => /^https?:\/\//i.test(u);

const CHANNELS = [
  { id: "discord", url: site.discord, label: site.nav.discord, ...LOGO.discord },
  { id: "facebook", url: site.facebook, label: site.nav.facebook, ...LOGO.facebook },
].filter((c) => isUrl(c.url));

export default function PopupNotice() {
  const ageOk = useAgeOk();
  const [closed, setClosed] = useState(false);
  // Có cổng 18+ thì đợi người dùng qua cổng rồi mới hiện (tránh hai hộp thoại tranh focus)
  const open = Boolean(cfg?.enabled && text) && !closed && (!site.ageGate.enabled || ageOk);
  const ref = useModal(open, () => setClosed(true));
  if (!open) return null;

  return (
    <div className="anim-fade fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/85 p-4" onClick={() => setClosed(true)}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="popup-title"
           className="anim-pop relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#14101f] shadow-2xl shadow-black/60 outline-none"
           onClick={(e) => e.stopPropagation()}>
        {/* Dải sáng trang trí phía trên */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(238,90,150,0.28),transparent)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#5eead4] via-[#ee5a96] to-[#5865F2]" />

        <button type="button" onClick={() => setClosed(true)} aria-label="Đóng"
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-haze transition hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="relative px-6 pb-7 pt-9 sm:px-10 sm:pt-11">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5eead4]">Thông báo từ {site.name}</p>
          <h2 id="popup-title" className="mt-3 text-balance text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
          <div aria-hidden className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-berry/70 to-transparent" />

          <p className="mt-6 max-h-[40vh] overflow-y-auto whitespace-pre-line text-left text-base leading-relaxed text-mist/90 sm:text-[17px]">{text}</p>

          {CHANNELS.length > 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-center text-sm text-haze">Gặp link lỗi hoặc cần hỗ trợ? Báo ngay tại</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {CHANNELS.map((c) => (
                  <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2.5 rounded-full px-5 py-3 font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
                     style={{ background: c.color }}>
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d={c.d} /></svg>
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <button type="button" data-autofocus onClick={() => setClosed(true)}
                  className="mt-5 w-full rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-md shadow-black/30 transition hover:-translate-y-0.5 active:scale-95">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
