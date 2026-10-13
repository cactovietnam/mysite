"use client";
import { useState } from "react";
import { engineColor } from "@/lib/game-ui";

type Props = {
  src?: string;
  title: string;
  engine: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean; // ảnh nền trang trí: bỏ alt, không hiện chữ cái dự phòng
};

// Ảnh bìa có dự phòng: nếu ảnh lỗi/không tải được thì hiện khối màu theo engine + chữ cái đầu.
export default function Cover({ src, title, engine, className = "", priority, decorative }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const c = engineColor(engine);
    return (
      <div
        className={`grid place-items-center ${className}`}
        style={{ background: `linear-gradient(145deg, ${c}66, #1a1530 75%)` }}
      >
        {!decorative && (
          <span className="font-display text-6xl font-bold text-white/60">{title.slice(0, 1)}</span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // chỉ ảnh eager mới kiểm tra lỗi trước hydrate; ảnh lazy chưa tải có thể báo complete sai
      ref={(el) => { if (el && priority && el.complete && el.naturalWidth === 0) setFailed(true); }}
      src={src}
      alt={decorative ? "" : title}
      aria-hidden={decorative || undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
