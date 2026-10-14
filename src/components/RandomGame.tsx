"use client";
import { useRouter } from "next/navigation";

// Nút "Ngẫu nhiên": nhảy tới một game bất kỳ. Chọn lúc bấm (không lúc render) nên không lệch hydration.
export default function RandomGame({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  if (slugs.length < 2) return null;

  return (
    <button type="button" onClick={() => router.push(`/game/${slugs[Math.floor(Math.random() * slugs.length)]}`)}
            className="glass inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 active:scale-95">
      <svg viewBox="0 0 20 20" className="size-4 text-berry" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="14" height="14" rx="3" />
        <circle cx="7.5" cy="7.5" r=".8" fill="currentColor" /><circle cx="12.5" cy="12.5" r=".8" fill="currentColor" /><circle cx="10" cy="10" r=".8" fill="currentColor" />
      </svg>
      Game ngẫu nhiên
    </button>
  );
}
