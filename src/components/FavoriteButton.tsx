"use client";
import { toggleFav, useList } from "@/lib/user-lists";

// Nút tim. variant "card": nút tròn nhỏ nổi trên thẻ game; "pill": nút chữ ở trang chi tiết.
export default function FavoriteButton({ slug, variant = "card" }: { slug: string; variant?: "card" | "pill" }) {
  const on = useList("fav").includes(slug);
  const heart = (
    <svg viewBox="0 0 20 20" className="size-4" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M10 17s-6.5-4-6.5-9A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 6.5 2c0 5-6.5 9-6.5 9Z" />
    </svg>
  );
  const label = on ? "Bỏ yêu thích" : "Thêm vào yêu thích";

  if (variant === "pill") {
    return (
      <button type="button" onClick={() => toggleFav(slug)} aria-pressed={on}
              className={`glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 active:scale-95 ${on ? "text-red-500" : ""}`}>
        {heart}{on ? "Đã yêu thích" : "Yêu thích"}
      </button>
    );
  }
  return (
    <button type="button" onClick={() => toggleFav(slug)} aria-pressed={on} aria-label={label} title={label}
            className={`glass grid size-9 place-items-center rounded-full transition active:scale-90 hover:bg-white/20 ${on ? "text-red-500" : "text-white"}`}>
      {heart}
    </button>
  );
}
