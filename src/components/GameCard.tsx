import Link from "next/link";
import { Game } from "@/data/games";

export default function GameCard({ game }: { game: Game }) {
  return (
    <Link href={`/game/${game.slug}`} className="group block">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.cover} alt={game.title}
             className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <h3 className="mt-3 line-clamp-1 font-medium">{game.title}</h3>
      <p className="text-xs text-white/50">{game.engine} · v{game.version}</p>
    </Link>
  );
}
