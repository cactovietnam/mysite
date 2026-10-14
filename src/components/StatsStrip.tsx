import type { Game } from "@/data/games";
import { fmtDate } from "@/lib/game-ui";

// Dải số liệu: tự tính từ games.json nên không cần sửa tay.
export default function StatsStrip({ games }: { games: Game[] }) {
  if (games.length === 0) return null;

  const totalGB = Math.round(games.reduce((s, g) => s + (g.sizeGB || 0), 0) * 10) / 10;
  const engines = new Set(games.map((g) => g.engine)).size;
  const latest = games.reduce((m, g) => (g.updatedAt > m ? g.updatedAt : m), "");

  const items = [
    { label: "Game trong kho", value: String(games.length), dot: "#ff6b98" },
    { label: "Tổng dung lượng", value: `${totalGB}GB`, dot: "#60a5fa" },
    { label: "Engine", value: String(engines), dot: "#2dd4bf" },
    { label: "Cập nhật gần nhất", value: fmtDate(latest), dot: "#fb923c" },
  ];

  return (
    <section aria-label="Thống kê" className="mx-auto mt-4 max-w-6xl px-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="glass rounded-2xl px-5 py-4">
            <dt className="flex items-center gap-2 text-sm text-haze">
              <i aria-hidden className="size-2 rounded-full" style={{ background: it.dot, boxShadow: `0 0 10px ${it.dot}` }} />
              {it.label}
            </dt>
            <dd className="mt-1.5 font-display text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl">{it.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
