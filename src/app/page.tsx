import { games } from "@/data/games";
import { site } from "@/data/site";
import Announcement from "@/components/Announcement";
import HeroSlider from "@/components/HeroSlider";
import HowTo from "@/components/HowTo";
import Library from "@/components/Library";
import StatsStrip from "@/components/StatsStrip";

const SLIDES = 5; // số game mới nhất đưa lên slider

export default function Home() {
  const sorted = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main>
      <h1 className="sr-only">{site.name} - {site.home.libraryTitle}</h1>
      <HeroSlider games={sorted.slice(0, SLIDES)} />
      <Announcement />
      <StatsStrip games={sorted} />
      <section id="kho-game" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 pt-16">
        <h2 className="mb-6 font-display text-3xl font-bold tracking-tight">{site.home.libraryTitle}</h2>
        <Library games={sorted} />
      </section>
      <HowTo />
    </main>
  );
}
