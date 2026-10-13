import Link from "next/link";
import type { Game } from "@/data/games";
import { engineColor, fmtDate } from "@/lib/game-ui";
import Cover from "./Cover";
import EngineChip from "./EngineChip";
import Tilt from "./Tilt";
import { site } from "@/data/site";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function Hero({ game }: { game: Game }) {
  const color = engineColor(game.engine);

  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/10 bg-plum">
        {/* nền: chính ảnh bìa, làm mờ */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <Cover decorative src={game.cover} title={game.title} engine={game.engine}
                 className="h-full w-full scale-125 object-cover opacity-40 md:opacity-55 md:blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-plum via-plum/75 to-plum/10" />
        </div>

        <div className="grid items-center gap-10 p-7 sm:p-10 md:grid-cols-[1.25fr_0.75fr] md:p-14">
          <div>
            <p className="anim-rise inline-flex items-center gap-2.5 rounded-full bg-berry/15 px-3.5 py-1.5 text-sm font-medium text-berry" style={d(0)}>
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-berry/70" />
                <span className="relative size-2 rounded-full bg-berry" />
              </span>
              {site.home.featuredBadge}
            </p>

            <h1 className="anim-rise mt-5 font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-6xl md:text-7xl" style={d(90)}>
              {game.title}
            </h1>

            <p className="anim-rise mt-6 max-w-[46ch] text-lg leading-relaxed text-mist/80" style={d(180)}>
              {game.description}
            </p>

            <div className="anim-rise mt-6 flex flex-wrap items-center gap-2.5 text-sm text-haze" style={d(260)}>
              <EngineChip engine={game.engine} className="bg-white/10 text-mist" />
              <span className="rounded-full bg-white/10 px-3 py-1">Phiên bản {game.version}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{game.sizeGB}GB</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Cập nhật {fmtDate(game.updatedAt)}</span>
            </div>

            <div className="anim-rise mt-9" style={d(340)}>
              <Link href={`/game/${game.slug}`}
                    className="inline-flex items-center rounded-full bg-berry px-7 py-3.5 font-semibold text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_var(--color-berry)] active:translate-y-0">
                {site.home.featuredButton}
              </Link>
            </div>
          </div>

          <div className="anim-rise mx-auto w-full max-w-[300px] md:max-w-[320px]" style={d(200)}>
            <Tilt className="rounded-[2rem]" style={{ boxShadow: `0 40px 90px -24px ${color}99` }}>
              <Link href={`/game/${game.slug}`} aria-label={game.title}
                    className="block aspect-[3/4] overflow-hidden rounded-[2rem] ring-1 ring-white/20">
                <Cover src={game.cover} title={game.title} engine={game.engine} priority className="h-full w-full object-cover" />
              </Link>
            </Tilt>
          </div>
        </div>
      </div>
    </section>
  );
}
