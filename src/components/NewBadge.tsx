"use client";
import { useSyncExternalStore } from "react";
import { daysSince } from "@/lib/game-ui";

const NEW_WITHIN_DAYS = 7;
const noSubscribe = () => () => {};

// Nhãn "Mới" nếu game cập nhật trong 7 ngày. Tính ở trình duyệt (không phải lúc build) nên không bị "mới" mãi khi chưa deploy lại.
// Server luôn render null, client bật sau hydrate nên không lệch HTML.
export default function NewBadge({ updatedAt, className = "" }: { updatedAt: string; className?: string }) {
  const isNew = useSyncExternalStore(
    noSubscribe,
    () => { const d = daysSince(updatedAt); return d >= 0 && d < NEW_WITHIN_DAYS; },
    () => false,
  );
  if (!isNew) return null;
  return (
    <span className={`rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-on-accent shadow-lg shadow-black/30 ${className}`}>
      Mới
    </span>
  );
}
