"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GameCardData } from "@/data/games";
import { site } from "@/data/site";
import { engineColor, fmtDate } from "@/lib/game-ui";
import { gameBadges } from "@/lib/game-badges";
import { softNav } from "@/lib/soft-nav";
import { useList } from "@/lib/user-lists";
import ReportMenu from "./ReportMenu";

type Tile = { id: string; label: string; count: number; dot: string; search: string };

// Lối tắt vào Kho game: mỗi ô là một bộ lọc dựng sẵn (engine, Việt hóa, Cheat) kèm số game thật,
// bấm là cuộn xuống Kho game và lọc ngay. Số liệu tự tính từ games.json, không cần sửa tay.
export default function QuickAccess({ games }: { games: GameCardData[] }) {
  const pathname = usePathname();
  const favCount = useList("fav").filter((s) => games.some((g) => g.slug === s)).length; // bỏ qua game đã xóa
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
    ...(favCount > 0 ? [{ id: "fav", label: "Yêu thích của bạn", count: favCount, dot: "#e5484d", search: "?list=fav" }] : []),
    ...(cheat > 0 ? [{ id: "cheat", label: "Có Cheat", count: cheat, dot: "#fbbf24", search: "?tag=Cheat" }] : []),
  ];
  const hasDiscord = /^https?:\/\//i.test(site.discord);
  const hasFacebook = /^https?:\/\//i.test(site.facebook);

  return (
    <section aria-label="Khám phá nhanh" className="mx-auto mt-4 max-w-6xl px-4">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="neon-title font-display text-lg font-bold tracking-tight">Khám phá nhanh</h2>
        {latest && <p className="text-xs tabular-nums text-haze">Cập nhật gần nhất: {fmtDate(latest)}</p>}
      </div>

      <ul className="flex flex-wrap items-center gap-2">
        {tiles.map((t) => (
          <li key={t.id}>
            <Link href={`/${t.search}#kho-game`} onClick={(e) => softNav(e, pathname, t.search, "library")}
                  className="glass group flex items-center gap-2 rounded-full py-2 pl-3.5 pr-4 text-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:scale-95">
              <i aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: t.dot, boxShadow: `0 0 10px ${t.dot}` }} />
              <span className="text-haze transition group-hover:text-mist">{t.label}</span>
              <span className="font-display font-extrabold tabular-nums">{t.count}</span>
            </Link>
          </li>
        ))}

        {(hasDiscord || hasFacebook) && <li><ReportMenu variant="tile" /></li>}
      </ul>
    </section>
  );
}
