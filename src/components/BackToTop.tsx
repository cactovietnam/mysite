"use client";
import { useEffect, useState } from "react";

const SHOW_AFTER = 700; // px đã cuộn thì mới hiện nút

// Nút nổi "lên đầu trang". Ẩn khi chưa cuộn; lúc ẩn không nhận chuột/phím (tabIndex -1, aria-hidden).
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Lên đầu trang" aria-hidden={!show} tabIndex={show ? 0 : -1}
            className={`glass fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full shadow-lg shadow-black/30 transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 active:scale-95 ${
              show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10 16V4m0 0-5 5m5-5 5 5" />
      </svg>
    </button>
  );
}
