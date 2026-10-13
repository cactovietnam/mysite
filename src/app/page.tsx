import { games } from "@/data/games";
import { site } from "@/data/site";
import Hero from "@/components/Hero";
import Library from "@/components/Library";

export default function Home() {
  const sorted = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const featured = sorted[0];

  return (
    <main>
      {featured && <Hero game={featured} />}
      <section id="kho-game" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 pt-16">
        <h2 className="mb-6 font-display text-3xl font-bold tracking-tight">{site.home.libraryTitle}</h2>
        <Library games={sorted} />
      </section>
    </main>
  );
}
