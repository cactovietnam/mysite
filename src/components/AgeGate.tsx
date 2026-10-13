"use client";
import { useSyncExternalStore } from "react";
import { useModal } from "@/lib/use-modal";

const KEY = "mysite-age-ok";
let memoryOk = false; // dự phòng khi trình duyệt chặn localStorage

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("age-ok", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("age-ok", cb); };
};
const read = () => {
  if (memoryOk) return true;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

// Cổng xác nhận 18+. Server luôn render cổng (an toàn mặc định), client ẩn đi nếu đã xác nhận.
export default function AgeGate() {
  const ok = useSyncExternalStore(subscribe, read, () => false);
  const ref = useModal(!ok);
  if (ok) return null;

  const accept = () => {
    memoryOk = true;
    try { localStorage.setItem(KEY, "1"); } catch { /* bỏ qua: đã có memoryOk */ }
    window.dispatchEvent(new Event("age-ok"));
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/95 p-4 backdrop-blur-md">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="age-title"
           className="glass w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl shadow-black/50 outline-none">
        <h2 id="age-title" className="font-display text-3xl font-extrabold tracking-tight">Nội dung dành cho người từ 18 tuổi</h2>
        <p className="mt-3 text-haze">Trang này có game người lớn. Chỉ vào tiếp nếu bạn đủ 18 tuổi.</p>
        <div className="mt-7 flex flex-col gap-3">
          <button data-autofocus onClick={accept}
                  className="rounded-full bg-berry px-7 py-3.5 font-semibold text-ink transition hover:-translate-y-0.5 active:scale-95">
            Tôi đủ 18 tuổi, vào trang
          </button>
          <a href="https://www.google.com" className="rounded-full bg-white/10 px-7 py-3.5 font-medium transition hover:bg-white/20">Rời khỏi trang</a>
        </div>
      </div>
    </div>
  );
}
