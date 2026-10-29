"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";

// Nút giỏ hàng trên header: bấm là sang trang /gio-hang (trang riêng, rộng rãi).
export default function CartButton() {
  const cart = useCart();
  return (
    <Link href="/gio-hang" aria-label={`Giỏ hàng${cart.length ? `, ${cart.length} game` : ""}`}
          className="relative grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/[0.16] active:scale-95 sm:size-10">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6" />
      </svg>
      {cart.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-berry px-1 text-[10px] font-bold leading-[1.1rem] text-ink">{cart.length}</span>}
    </Link>
  );
}
