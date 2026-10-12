import Link from "next/link";
import { Game } from "@/data/games";

export default function Hero({ game }: { game: Game }) {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden px-6 md:px-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={game.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10" />
      <div className="relative max-w-3xl py-16">
        <p className="mb-4 text-sm text-orange-400">Vừa cập nhật</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] md:text-8xl">
          {game.title}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{game.description}</p>
        <p className="mt-6 text-sm text-white/50">
          Phiên bản {game.version} · {game.engine} · {game.sizeGB}GB
        </p>
        <Link href={`/game/${game.slug}`}
              className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-white/90">
          Vào trang game
        </Link>
      </div>
    </section>
  );
}
