import Link from "next/link";
import type { Game } from "@/data/games";
import { engineColor } from "@/lib/game-ui";
import Cover from "./Cover";
import EngineChip from "./EngineChip";

export default function GameCard({ game }: { game: Game }) {
  const color = engineColor(game.engine);
  return (
    <Link href={`/game/${game.slug}`}
          className="group block rounded-[1.9rem] p-2.5 transition duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.06]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-plum ring-1 ring-white/10 transition-shadow duration-500 group-hover:shadow-[0_28px_56px_-20px_var(--c)]"
           style={{ "--c": color } as React.CSSProperties}>
        <Cover src={game.cover} title={game.title} engine={game.engine}
               className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <EngineChip engine={game.engine} className="glass absolute left-3 top-3" />
      </div>
      <h3 className="mt-3.5 line-clamp-1 px-1 font-display text-lg font-semibold tracking-tight">{game.title}</h3>
      <p className="mt-0.5 flex gap-3 px-1 text-sm text-haze">
        <span>v{game.version}</span>
        <span>{game.sizeGB}GB</span>
      </p>
    </Link>
  );
}
