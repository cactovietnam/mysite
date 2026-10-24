import { useEffect, useState } from "react";

// Giữ hộp thoại trên màn hình thêm `ms` mili giây sau khi đóng để chạy hiệu ứng biến mất.
// mounted: còn render (mở hoặc đang đóng) | closing: đang chạy hiệu ứng đóng (gắn class anim-out-*).
export function usePresence(open: boolean, ms = 160) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true); // đặt state ngay trong lúc render: phần tử có mặt ngay ở lần commit đầu (useModal cần nó để focus)
  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, mounted, ms]);
  return { mounted, closing: mounted && !open };
}
