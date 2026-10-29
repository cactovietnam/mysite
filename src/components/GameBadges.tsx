import type { PatchBadge } from "@/lib/game-badges";

// Huy hiệu dùng chung cho thẻ game, slider và trang chi tiết (dữ liệu từ gameBadges() trong lib/game-badges.ts).
export function PatchChip({ patch }: { patch: PatchBadge }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-white"
          style={{
            background: `linear-gradient(90deg, ${patch.from}59, ${patch.to}59), rgba(15,12,26,0.74)`,
            borderColor: `${patch.from}99`,
          }}>
      {patch.label}
    </span>
  );
}

export function AdultChip({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded-lg bg-red-600 px-2 py-0.5 text-xs font-extrabold tracking-wide text-white shadow-lg shadow-black/40 ${className}`}>
      18+
    </span>
  );
}
