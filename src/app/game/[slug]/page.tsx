import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import { engineColor, fmtDate } from "@/lib/game-ui";
import Cover from "@/components/Cover";
import EngineChip from "@/components/EngineChip";
import Gallery from "@/components/Gallery";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  if (!game) return {};
  return { title: game.title, description: game.description, openGraph: { images: [game.cover] } };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  if (!game) notFound();

  const color = engineColor(game.engine);
  const stats = [
    { label: "Phiên bản", value: game.version },
    { label: "Dung lượng", value: `${game.sizeGB}GB` },
    { label: "Cập nhật", value: fmtDate(game.updatedAt) },
  ];

  return (
    <main className="relative isolate">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[70vh] overflow-hidden">
        <Cover decorative src={game.cover} title={game.title} engine={game.engine}
               className="h-full w-full scale-125 object-cover opacity-35 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/60 to-ink" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10">
        <Link href="/" className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition hover:bg-white/15">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m12 4-6 6 6 6" />
          </svg>
          Kho game
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
          <div className="mx-auto w-full max-w-[300px] self-start lg:sticky lg:top-28 lg:max-w-none">
            <div className="aspect-[3/4] overflow-hidden rounded-[2rem] ring-1 ring-white/20"
                 style={{ boxShadow: `0 40px 90px -28px ${color}aa` }}>
              <Cover src={game.cover} title={game.title} engine={game.engine} priority className="h-full w-full object-cover" />
            </div>
          </div>

          <div>
            <EngineChip engine={game.engine} className="glass" />
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-balance md:text-6xl">
              {game.title}
            </h1>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="glass rounded-2xl px-4 py-3">
                  <dt className="text-xs text-haze">{s.label}</dt>
                  <dd className="mt-0.5 font-display text-lg font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 max-w-[62ch] text-lg leading-relaxed text-mist/80">{game.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {game.tags.map((t) => (
                <span key={t} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-mist/90">{t}</span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {game.links.map((l, i) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                   className={`rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 ${
                     i === 0
                       ? "bg-berry text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] hover:shadow-[0_18px_44px_-10px_var(--color-berry)]"
                       : "glass hover:bg-white/15"}`}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {game.images.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 font-display text-3xl font-bold tracking-tight">Hình ảnh</h2>
            <Gallery images={game.images} title={game.title} />
          </section>
        )}
      </div>
    </main>
  );
}
