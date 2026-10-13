import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import { engineColor, fmtDate } from "@/lib/game-ui";
import Cover from "@/components/Cover";
import DownloadPanel from "@/components/DownloadPanel";
import EngineChip from "@/components/EngineChip";
import Gallery from "@/components/Gallery";
import Tilt from "@/components/Tilt";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  if (!game) return {};
  return {
    title: game.title,
    description: game.description,
    openGraph: game.cover ? { images: [game.cover] } : undefined,
  };
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
    <main>
      {/* Hero tràn màn hình: ảnh game làm phông, làm mờ và tối dần về phía chữ */}
      <section className="relative isolate -mt-14 flex min-h-[min(88vh,860px)] items-end overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Cover decorative src={game.cover} title={game.title} engine={game.engine}
                 className="h-full w-full scale-110 object-cover opacity-80 blur-md" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl items-end gap-10 px-4 pb-14 pt-32 lg:grid-cols-[1fr_290px]">
          <div>
            <Link href="/" className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition hover:bg-white/15">
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m12 4-6 6 6 6" />
              </svg>
              Kho game
            </Link>

            <div className="mt-8 flex flex-wrap gap-2">
              <EngineChip engine={game.engine} className="glass" />
              {game.tags.map((t) => (
                <span key={t} className="glass rounded-full px-3.5 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>

            <h1 className="mt-5 max-w-[16ch] font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-6xl md:text-7xl">
              {game.title}
            </h1>

            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-mist/85">{game.description}</p>

            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-sm text-haze">{s.label}</dt>
                  <dd className="mt-0.5 font-display text-2xl font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DownloadPanel links={game.links} title={game.title} />
              {game.images.length > 0 && (
                <a href="#hinh-anh" className="glass rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">
                  Xem hình ảnh
                </a>
              )}
            </div>
          </div>

          <div className="mx-auto hidden w-full max-w-[290px] lg:block">
            <Tilt className="rounded-[2rem]" style={{ boxShadow: `0 40px 90px -24px ${color}aa` }}>
              <div className="aspect-[3/4] overflow-hidden rounded-[2rem] ring-1 ring-white/20">
                <Cover src={game.cover} title={game.title} engine={game.engine} priority className="h-full w-full object-cover" />
              </div>
            </Tilt>
          </div>
        </div>
      </section>

      {game.images.length > 0 && (
        <section id="hinh-anh" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 pt-12">
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight">Hình ảnh</h2>
          <Gallery images={game.images} title={game.title} />
        </section>
      )}
    </main>
  );
}
