import { games } from "@/data/games";
import { site } from "@/data/site";
import Announcement from "@/components/Announcement";
import HeroSlider from "@/components/HeroSlider";
import HowTo from "@/components/HowTo";
import Library from "@/components/Library";
import RandomGame from "@/components/RandomGame";
import QuickAccess from "@/components/QuickAccess";

const SLIDES = 5; // số game mới nhất đưa lên slider

export default function Home() {
  const sorted = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main>
      <h1 className="sr-only">{site.name} - {site.home.libraryTitle}</h1>
      <HeroSlider games={sorted.slice(0, SLIDES)} />
      <Announcement />
      <QuickAccess games={sorted} />
      <section id="kho-game" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 pt-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">{site.home.libraryTitle}</h2>
          <RandomGame slugs={sorted.map((g) => g.slug)} />
        </div>
        <Library games={sorted} />
      </section>
      <HowTo />
    </main>
  );
}
