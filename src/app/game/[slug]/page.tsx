import { notFound } from "next/navigation";
import { games } from "@/data/games";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <h1 className="font-[family-name:var(--font-display)] text-5xl">{game.title}</h1>
      <p className="mt-3 text-sm text-white/50">
        {game.engine} · v{game.version} · {game.sizeGB}GB · cập nhật {game.updatedAt}
      </p>
      <p className="mt-8 max-w-2xl leading-relaxed text-white/80">{game.description}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {game.tags.map((t) => (
          <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs">{t}</span>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {game.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
             className="rounded-xl bg-white px-5 py-2.5 font-semibold text-black hover:bg-white/90">
            {l.label}
          </a>
        ))}
      </div>
    </main>
  );
}
