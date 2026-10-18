import Link from "next/link";
import { thumbOf, type Game } from "@/data/games";
import Cover from "./Cover";

// Gợi ý game tương tự: điểm = số tag trùng x2, cùng engine +1. Không có game trùng thì không hiện gì.
export default function SimilarGames({ current, all }: { current: Game; all: Game[] }) {
  const list = all
    .filter((g) => g.slug !== current.slug)
    .map((g) => ({
      g,
      score: g.tags.filter((t) => current.tags.includes(t)).length * 2 + (g.engine === current.engine ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.g.updatedAt.localeCompare(a.g.updatedAt))
    .slice(0, 4)
    .map((x) => x.g);

  if (list.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 px-1 font-display text-xl font-bold tracking-tight">Game tương tự</h2>
      <ul className="space-y-2">
        {list.map((g) => (
          <li key={g.slug}>
            <Link href={`/game/${g.slug}`}
                  className="group flex items-center gap-3.5 rounded-xl bg-white/[0.05] p-2.5 transition duration-300 hover:translate-x-1 hover:bg-white/[0.1]">
              <Cover src={thumbOf(g)} title={g.title} engine={g.engine}
                     className="h-[72px] w-14 shrink-0 rounded-2xl object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{g.title}</span>
                <span className="block truncate text-xs text-haze">{g.engine}{g.tags[0] ? `, ${g.tags[0]}` : ""}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
