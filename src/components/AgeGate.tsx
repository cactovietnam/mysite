"use client";
import { useState, useSyncExternalStore } from "react";
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
export const useAgeOk = () => useSyncExternalStore(subscribe, read, () => false);

// Cổng xác nhận 18+: phải tick ô đồng ý rồi mới bấm vào được. Server luôn render cổng, client ẩn nếu đã xác nhận.
export default function AgeGate() {
  const ok = useSyncExternalStore(subscribe, read, () => false);
  const ref = useModal(!ok);
  const [agreed, setAgreed] = useState(false);
  if (ok) return null;

  const accept = () => {
    if (!agreed) return;
    memoryOk = true;
    try { storage()?.setItem(KEY, "1"); } catch { /* bỏ qua: đã có memoryOk */ }
    window.dispatchEvent(new Event("age-ok"));
  };

  return (
    // Lớp ngoài cuộn được: màn hình thấp (điện thoại ngang) vẫn thấy hết nút bấm
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink/95">
      <div className="grid min-h-full place-items-center p-4">
        <div ref={ref} data-focus-root tabIndex={-1} role="dialog" aria-modal="true"
             aria-labelledby="age-title" aria-describedby="age-desc"
             className="anim-pop w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-plum shadow-2xl shadow-black/50 outline-none md:grid md:grid-cols-[5fr_7fr]">

          <div aria-hidden className="grid place-items-center px-6 py-8 md:py-12"
               style={{ backgroundImage: "radial-gradient(70% 60% at 50% 45%, rgba(167, 139, 250,0.28), transparent 70%)" }}>
            <div className="grid size-32 place-items-center rounded-full border-2 border-berry/70 bg-ink/40 shadow-[0_0_80px_-12px_var(--color-berry)] md:size-52">
              <span className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">18+</span>
            </div>
          </div>

          <div className="p-6 pt-2 sm:p-9 sm:pt-4 md:p-10">
            <h2 id="age-title" className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
              Cảnh báo nội dung người lớn
            </h2>
            <p id="age-desc" className="mt-3 max-w-[52ch] leading-relaxed text-haze">
              {site.name} có hình ảnh, ngôn ngữ và trò chơi chỉ dành cho người trưởng thành. Chỉ vào tiếp khi bạn đã đủ 18 tuổi và việc truy cập là hợp pháp tại nơi bạn sống.
            </p>

            <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm leading-relaxed text-haze">
              <p className="font-semibold text-mist">Miễn trừ trách nhiệm</p>
              <p>Bạn tự chịu trách nhiệm về việc khai báo độ tuổi, quyết định truy cập và cách dùng nội dung.</p>
              <p>{site.name} không chịu trách nhiệm với việc khai báo sai hoặc truy cập trái quy định pháp luật nơi bạn sống.</p>
              <p>Nội dung trong game là hư cấu, không đại diện cho bất kỳ người thật nào.</p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="peer sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span aria-hidden
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-berry ${
                      agreed ? "border-berry bg-berry text-ink" : "border-white/30"}`}>
                {agreed && (
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                  </svg>
                )}
              </span>
              <span>Tôi xác nhận đã đủ 18 tuổi, đã đọc và đồng ý với cảnh báo trên.</span>
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={accept} disabled={!agreed}
                      className="rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-md shadow-black/30 transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 sm:flex-1">
                Vào {site.name}
              </button>
              <a href="https://www.google.com"
                 className="rounded-full bg-white/10 px-7 py-3.5 text-center font-medium transition hover:bg-white/20 sm:flex-1">
                Tôi chưa đủ 18 tuổi, rời trang
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
