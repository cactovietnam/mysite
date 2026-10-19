"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GameCardData } from "@/data/games";
import { site } from "@/data/site";
import { engineColor, fmtDate } from "@/lib/game-ui";
import { gameBadges } from "@/lib/game-badges";
import { softNav } from "@/lib/soft-nav";

type Tile = { id: string; label: string; count: number; dot: string; search: string };

const arrow = (
  <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-haze transition duration-300 group-hover:translate-x-0.5 group-hover:text-mist"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 10h12m0 0-4-4m4 4-4 4" />
  </svg>
);

// Lối tắt vào Kho game: mỗi ô là một bộ lọc dựng sẵn (engine, Việt hóa, Cheat) kèm số game thật,
// bấm là cuộn xuống Kho game và lọc ngay. Số liệu tự tính từ games.json, không cần sửa tay.
export default function QuickAccess({ games }: { games: GameCardData[] }) {
  const pathname = usePathname();
  if (games.length === 0) return null;

  const engines = Array.from(new Set(games.map((g) => g.engine)));
  const badges = games.map((g) => gameBadges(g.tags).patch?.label ?? "");
  const vh = badges.filter((l) => l === "Việt hóa" || l === "VH&Cheat").length;
  const cheat = badges.filter((l) => l === "Cheat" || l === "VH&Cheat").length;
  const latest = games.reduce((m, g) => (g.updatedAt > m ? g.updatedAt : m), "");

  const tiles: Tile[] = [
    { id: "all", label: "Tất cả game", count: games.length, dot: "#ff6b98", search: "" },
    ...engines.map((e) => ({
      id: `e-${e}`, label: e, count: games.filter((g) => g.engine === e).length,
      dot: engineColor(e), search: `?engine=${encodeURIComponent(e)}`,
    })),
    ...(vh > 0 ? [{ id: "vh", label: "Việt hóa", count: vh, dot: "#2dd4bf", search: `?tag=${encodeURIComponent("Việt hóa")}` }] : []),
    ...(cheat > 0 ? [{ id: "cheat", label: "Có Cheat", count: cheat, dot: "#fbbf24", search: "?tag=Cheat" }] : []),
  ];
  const hasDiscord = /^https?:\/\//i.test(site.discord);
  const hasFacebook = /^https?:\/\//i.test(site.facebook);

  return (
    <section aria-label="Khám phá nhanh" className="mx-auto mt-4 max-w-6xl px-4">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-display text-lg font-bold tracking-tight">Khám phá nhanh</h2>
        {latest && <p className="text-xs tabular-nums text-haze">Cập nhật gần nhất: {fmtDate(latest)}</p>}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.id}>
            <Link href={`/${t.search}#kho-game`} onClick={(e) => softNav(e, pathname, t.search, "library")}
                  className="glass group flex h-full items-center justify-between gap-3 rounded-2xl px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm text-haze">
                  <i aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: t.dot, boxShadow: `0 0 10px ${t.dot}` }} />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="mt-1 block font-display text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl">
                  {t.count}<span className="ml-1.5 text-sm font-medium text-haze">game</span>
                </span>
              </span>
              {arrow}
            </Link>
          </li>
        ))}

        {hasDiscord && (
          <li className="col-span-2 sm:col-span-1">
            <a href={site.discord} target="_blank" rel="noopener noreferrer"
               className="group relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 px-5 py-4 transition duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
               style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.34), rgba(255,107,152,0.2)), rgba(30,24,56,0.84)" }}>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold tracking-tight">{site.nav.discord}</span>
                <span className="mt-0.5 block text-xs leading-snug text-mist/75">Báo link lỗi, nhận tin game mới</span>
              </span>
              {arrow}
            </a>
          </li>
        )}

        {hasFacebook && (
          <li className="col-span-2 sm:col-span-1">
            <a href={site.facebook} target="_blank" rel="noopener noreferrer"
               className="group relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 px-5 py-4 transition duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
               style={{ background: "linear-gradient(135deg, rgba(24,119,242,0.34), rgba(124,92,255,0.2)), rgba(30,24,56,0.84)" }}>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold tracking-tight">{site.nav.facebook}</span>
                <span className="mt-0.5 block text-xs leading-snug text-mist/75">Báo link lỗi, hỗ trợ trực tiếp</span>
              </span>
              {arrow}
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}
