"use client";
import { useSyncExternalStore } from "react";
import { useModal } from "@/lib/use-modal";
import { site } from "@/data/site";

// Khi nào hỏi lại (site.json -> ageGate.remember):
//   "never"   : hỏi lại mỗi lần tải lại trang (mặc định)
//   "session" : nhớ đến khi đóng tab
//   "forever" : nhớ mãi trên trình duyệt
type Remember = "never" | "session" | "forever";
const raw = (site.ageGate as { remember?: string }).remember;
const remember: Remember = raw === "session" || raw === "forever" ? raw : "never";

const KEY = "mysite-age-ok";
let memoryOk = false; // đã xác nhận trong lần tải trang này (chuyển trang nội bộ không hỏi lại)

const storage = () => (remember === "forever" ? localStorage : remember === "session" ? sessionStorage : null);

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("age-ok", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("age-ok", cb); };
};
const read = () => {
  if (memoryOk) return true;
  try { return storage()?.getItem(KEY) === "1"; } catch { return false; }
};

// Cổng xác nhận 18+: chỉ qua được khi bấm nút. Server luôn render cổng, client ẩn nếu đã xác nhận.
export default function AgeGate() {
  const ok = useSyncExternalStore(subscribe, read, () => false);
  const ref = useModal(!ok);
  if (ok) return null;

  const accept = () => {
    memoryOk = true;
    try { storage()?.setItem(KEY, "1"); } catch { /* bỏ qua: đã có memoryOk */ }
    window.dispatchEvent(new Event("age-ok"));
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/95 p-4 md:backdrop-blur-md">
      <div ref={ref} data-focus-root tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="age-title"
           className="glass w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl shadow-black/50 outline-none">
        <h2 id="age-title" className="font-display text-3xl font-extrabold tracking-tight">Nội dung dành cho người từ 18 tuổi</h2>
        <p className="mt-3 text-haze">Trang này có game người lớn. Chỉ vào tiếp nếu bạn đủ 18 tuổi.</p>
        <div className="mt-7 flex flex-col gap-3">
          <button onClick={accept}
                  className="rounded-full bg-berry px-7 py-3.5 font-semibold text-ink transition hover:-translate-y-0.5 active:scale-95">
            Tôi đủ 18 tuổi, vào trang
          </button>
          <a href="https://www.google.com" className="rounded-full bg-white/10 px-7 py-3.5 font-medium transition hover:bg-white/20">Rời khỏi trang</a>
        </div>
      </div>
    </div>
  );
}
