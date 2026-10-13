import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import { site } from "@/data/site";
import { accentStyle, fmtDate } from "@/lib/game-ui";
import Cover from "@/components/Cover";
import DownloadPanel from "@/components/DownloadPanel";
import EngineChip from "@/components/EngineChip";
import Gallery from "@/components/Gallery";
import SimilarGames from "@/components/SimilarGames";
import TagList from "@/components/TagList";

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

  const stats = [
    { label: "Phiên bản", value: game.version },
    { label: "Dung lượng", value: `${game.sizeGB}GB` },
    { label: "Cập nhật", value: fmtDate(game.updatedAt) },
  ];

  return (
    // --accent / --accent2 / --on-accent của game này: nút tải, glow, viền chip bên trong đều lấy từ đây
    <main style={accentStyle(game)}>
      {/* Hero: ảnh CHÍNH rõ nét bên phải, bị "che" dần bằng lớp tối từ trái sang và từ dưới lên */}
      <section className="relative isolate -mt-14 flex min-h-[560px] md:min-h-[min(82vh,760px)] items-end overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-cover"
             style={game.blur ? { backgroundImage: `url("${game.blur}")` } : undefined}>
          <Cover decorative priority src={game.cover} title={game.title} engine={game.engine}
                 className="h-full w-full object-cover object-[60%_20%] md:object-[65%_25%]" />
          <div className="absolute inset-0"
               style={{ background: "radial-gradient(55% 70% at 85% 15%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)" }} />
          <div className="absolute inset-0 hidden md:block"
               style={{ background: "linear-gradient(90deg, #0f0c1a 0%, rgba(15,12,26,0.9) 24%, rgba(15,12,26,0.5) 46%, rgba(15,12,26,0) 72%)" }} />
          <div className="absolute inset-0 md:hidden"
               style={{ background: "linear-gradient(180deg, rgba(15,12,26,0.45) 0%, rgba(15,12,26,0) 24%, rgba(15,12,26,0.85) 62%, #0f0c1a 100%)" }} />
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(0deg, #0f0c1a 0%, rgba(15,12,26,0) 20%), linear-gradient(180deg, rgba(15,12,26,0.6) 0%, rgba(15,12,26,0) 18%)" }} />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32">
          <Link href="/" className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition hover:bg-white/15">
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m12 4-6 6 6 6" />
            </svg>
            {site.home.libraryTitle}
          </Link>

          {/* Tag tự xuống dòng; quá 10 tag thì gập lại + "Xem thêm" */}
          <TagList className="mt-7 max-w-3xl" lead={<EngineChip engine={game.engine} className="glass ring-1 ring-accent/45" />} tags={game.tags} />

          <h1 className="mt-5 max-w-[18ch] font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-balance sm:text-6xl md:text-7xl">
            {game.title}
          </h1>

          <p className="mt-4 line-clamp-3 max-w-[58ch] text-base leading-relaxed text-white/70 sm:text-lg md:line-clamp-none">{game.description}</p>

          <dl className="mt-7 flex max-w-xl flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-5">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-haze">{s.label}</dt>
                <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <DownloadPanel links={game.links} title={game.title} />
            {game.images.length > 0 && (
              <a href="#hinh-anh" className="glass rounded-full px-6 py-3 font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">
                Xem hình ảnh
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-6 lg:grid-cols-[340px_1fr] lg:gap-12">
        <aside className="order-2 space-y-8 lg:order-1">
          <dl className="glass divide-y divide-white/10 rounded-[1.75rem] px-5">
            {[
              ["Engine", game.engine],
              ["Phiên bản", game.version],
              ["Dung lượng", `${game.sizeGB}GB`],
              ["Cập nhật", fmtDate(game.updatedAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-sm text-haze">{k}</dt>
                <dd className="text-right text-sm font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <SimilarGames current={game} all={games} />
        </aside>

        <div className="order-1 min-w-0 space-y-10 lg:order-2 lg:space-y-12">
          <section>
            <h2 className="mb-3 font-display text-3xl font-bold tracking-tight">Giới thiệu</h2>
            <p className="max-w-[62ch] whitespace-pre-line text-lg leading-relaxed text-white/70">{game.description}</p>
          </section>

          {/* Ảnh BỔ SUNG (tối đa 10): giúp hiểu thêm về game, không gồm ảnh chính */}
          {game.images.length > 0 && (
            <section id="hinh-anh" className="scroll-mt-24">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-3xl font-bold tracking-tight">Ảnh trong game</h2>
                <span className="text-sm text-haze">{game.images.length} ảnh</span>
              </div>
              <Gallery images={game.images} title={game.title} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
