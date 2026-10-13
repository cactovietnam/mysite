"use client";
import { useEffect, useState } from "react";

// Lưới ảnh + xem phóng to (Esc đóng, phím mũi tên chuyển ảnh)
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState<number | null>(null);
  const n = images.length;

  useEffect(() => {
    if (cur === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCur(null);
      if (e.key === "ArrowRight") setCur((c) => (c === null ? c : (c + 1) % n));
      if (e.key === "ArrowLeft") setCur((c) => (c === null ? c : (c - 1 + n) % n));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, n]);

  const circle = "glass absolute grid size-12 place-items-center rounded-full text-xl transition hover:bg-white/20";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((src, i) => (
          <button key={src} onClick={() => setCur(i)} aria-label={`Xem ảnh ${i + 1} của ${title}`}
                  className={`group overflow-hidden rounded-[1.75rem] bg-plum ring-1 ring-white/10 ${
                    i === 0 ? "aspect-video sm:col-span-2" : "aspect-[16/10]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${title} - ảnh ${i + 1}`} loading="lazy" decoding="async"
                 className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          </button>
        ))}
      </div>

      {cur !== null && (
        <div role="dialog" aria-modal="true" aria-label="Xem ảnh"
             className="anim-fade fixed inset-0 z-50 grid place-items-center bg-ink/90 p-4 backdrop-blur-md"
             onClick={() => setCur(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={cur} src={images[cur]} alt={`${title} - ảnh ${cur + 1}`}
               className="anim-pop max-h-[84vh] max-w-full rounded-[1.75rem] object-contain shadow-2xl shadow-black/60"
               onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setCur(null)} aria-label="Đóng" className={`${circle} right-4 top-4`}>&times;</button>
          {n > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCur((cur - 1 + n) % n); }} aria-label="Ảnh trước" className={`${circle} left-4 top-1/2 -translate-y-1/2`}>&#8249;</button>
              <button onClick={(e) => { e.stopPropagation(); setCur((cur + 1) % n); }} aria-label="Ảnh sau" className={`${circle} right-4 top-1/2 -translate-y-1/2`}>&#8250;</button>
            </>
          )}
          <p className="glass absolute bottom-5 rounded-full px-4 py-1.5 text-sm">{cur + 1} / {n}</p>
        </div>
      )}
    </>
  );
}
