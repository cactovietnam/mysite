"use client";
import { useEffect, useState } from "react";
import { addToCart, openCart, useCart } from "@/lib/cart";
import { loadKeyPrices } from "./CartButton";

// Nút "Mua key" ở trang game: chỉ hiện khi game có bán key. Bấm = thêm vào giỏ và mở giỏ.
export default function BuyKeyButton({ slug }: { slug: string }) {
  const cart = useCart();
  const [price, setPrice] = useState<number | null | undefined>(undefined); // undefined = đang tải | null = không bán key
  useEffect(() => {
    let dead = false;
    loadKeyPrices().then((m) => { if (!dead) setPrice(m.has(slug) ? m.get(slug)! : null); }, () => { if (!dead) setPrice(null); });
    return () => { dead = true; };
  }, [slug]);

  if (!price) return null;
  const inCart = cart.includes(slug);
  return (
    <button type="button" onClick={() => { addToCart(slug); openCart(); }}
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 active:scale-95">
      <svg viewBox="0 0 24 24" className="size-5 text-berry" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6" />
      </svg>
      {inCart ? "Xem giỏ hàng" : `Mua key · ${price.toLocaleString("vi-VN")}đ`}
    </button>
  );
}
