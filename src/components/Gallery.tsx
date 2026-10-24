"use client";
import { useEffect, useRef, useState } from "react";
import { useModal } from "@/lib/use-modal";

const btn = "glass rounded-full px-5 py-2.5 text-sm font-medium transition hover:bg-white/20 active:scale-95";

// Lưới ảnh nhỏ gọn 2 cột + xem lớn (phím mũi tên / vuốt ngang để chuyển ảnh)
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const open = cur !== null;

  const go = (d: number) => { setZoom(false); setCur((c) => (c === null ? c : (c + d + n) % n)); };
  const close = () => { setZoom(false); setCur(null); };

  // useModal lo khóa cuộn nền, nhốt Tab, Esc đóng và trả focus; ở đây chỉ còn phím mũi tên.
  const dialogRef = useModal(open, close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setZoom(false); setCur((c) => (c === null ? c : (c + 1) % n)); }
      if (e.key === "ArrowLeft") { setZoom(false); setCur((c) => (c === null ? c : (c - 1 + n) % n)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {images.map((src, i) => (
          <button key={src} onClick={() => setCur(i)} aria-label={`Xem lớn ảnh ${i + 1} của ${title}`}
                  className="group relative aspect-video overflow-hidden rounded-2xl bg-plum ring-1 ring-white/10 lg:aspect-auto lg:h-[26vh] lg:min-h-[150px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${title} - ảnh ${i + 1}`} loading="lazy" decoding="async"
                 className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
            <span className="glass absolute left-2 top-2 rounded-lg px-2 py-0.5 text-xs font-semibold">{i + 1}</span>
            <span className="glass absolute bottom-2 right-2 rounded-full px-3 py-1 text-xs font-medium transition group-hover:bg-white/25">Xem lớn</span>
          </button>
        ))}
      </div>

      {cur !== null && (
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Xem ảnh"
             className="anim-fade fixed inset-0 z-50 flex flex-col bg-ink/95"
             onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
             onTouchEnd={(e) => {
               if (touchX.current === null || zoom) return;
               const dx = e.changedTouches[0].clientX - touchX.current;
               touchX.current = null;
               if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
             }}>
          <div className="flex items-center justify-between p-3 sm:p-4">
            <span className="glass rounded-full px-4 py-2 text-sm font-medium">{cur + 1}/{n}</span>
            <div className="flex gap-2">
              <button onClick={() => setZoom((z) => !z)} className={btn}>{zoom ? "Thu nhỏ" : "Phóng thêm"}</button>
              <button onClick={close} className={btn}>Đóng &times;</button>
            </div>
          </div>

          <div className={`min-h-0 flex-1 px-3 ${zoom ? "overflow-auto" : "grid place-items-center overflow-hidden"}`}
               onClick={() => { if (!zoom) close(); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={cur} src={images[cur]} alt={`${title} - ảnh ${cur + 1}`}
                 className={zoom
                   ? "w-[180%] max-w-none rounded-2xl sm:w-[140%]"
                   : "anim-pop max-h-[calc(100dvh-9rem)] max-w-full rounded-2xl object-contain"}
                 onClick={(e) => e.stopPropagation()} />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <button onClick={() => go(-1)} className={btn}>Ảnh trước</button>
            <span className="hidden text-center text-sm text-haze sm:block">Vuốt ngang hoặc dùng phím trái/phải</span>
            <button onClick={() => go(1)} className={btn}>Ảnh sau</button>
          </div>
        </div>
      )}
    </>
  );
}
