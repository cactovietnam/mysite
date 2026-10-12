import { games } from "@/data/games";
import Hero from "@/components/Hero";
import GameCard from "@/components/GameCard";

export default function Home() {
  const sorted = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const featured = sorted[0];

  return (
    <main>
      {featured && <Hero game={featured} />}
      <section className="px-6 py-12 md:px-10">
        <h2 className="mb-6 text-lg font-semibold">Kho game</h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-6">
          {sorted.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      </section>
    </main>
  );
}
