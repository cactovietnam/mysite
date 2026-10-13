"use client";
import { useRef } from "react";

// Bọc nội dung để nghiêng 3D nhẹ theo chuột (chỉ chuột, bỏ qua cảm ứng).
export default function Tilt({ children, className = "", style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(0)}%`);
    el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(0)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    ["--rx", "--ry", "--gx", "--gy"].forEach((p) => el.style.removeProperty(p));
  };

  return (
    <div style={{ perspective: 1000 }} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} className={`tilt relative ${className}`} style={style}>
        {children}
        <span className="tilt-glare" />
      </div>
    </div>
  );
}
