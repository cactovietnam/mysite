"use client";
import { useState } from "react";
import { site } from "@/data/site";
import { useModal } from "@/lib/use-modal";
import { useAgeOk } from "./AgeGate";

// Bảng thông báo của admin: hiện MỖI LẦN vào web (tải lại trang thì hiện lại, chuyển trang trong web thì không).
// Sửa ở quan_ly.py > mục 7 > [1] (site.json -> popup). Thông báo game mới chỉ đi qua chuông, không qua bảng này.
const cfg = (site as unknown as { popup?: { enabled?: boolean; title?: string; text?: string } }).popup;
const text = (cfg?.text ?? "").trim();
const title = (cfg?.title ?? "").trim() || "Thông báo";

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
           className="glass anim-pop w-full max-w-md rounded-[2rem] p-6 text-center shadow-2xl shadow-black/50 outline-none sm:p-8"
           onClick={(e) => e.stopPropagation()}>
        <h2 id="popup-title" className="font-display text-2xl font-extrabold tracking-tight text-balance">{title}</h2>
        <p className="mt-4 whitespace-pre-line text-left leading-relaxed text-mist/85">{text}</p>
        <button type="button" data-autofocus onClick={() => setClosed(true)}
                className="mt-6 w-full rounded-full bg-berry px-7 py-3 font-semibold text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] transition hover:-translate-y-0.5 active:scale-95">
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
