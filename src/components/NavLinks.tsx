"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/data/site";
import { softNav } from "@/lib/soft-nav";

const tab =
  "relative flex h-14 shrink-0 items-center px-3.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-center after:rounded-full after:bg-gradient-to-r after:from-berry after:to-[#7c5cff] after:transition-transform after:duration-300";
const idle = "text-mist/70 after:scale-x-0 hover:text-mist hover:after:scale-x-100";
const active = "text-mist after:scale-x-100";

export default function NavLinks({ engines }: { engines: string[] }) {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <nav aria-label="Chính" className="hidden min-w-0 flex-1 justify-center overflow-x-auto [scrollbar-width:none] md:flex">
      <Link href="/" aria-current={home ? "page" : undefined} onClick={(e) => softNav(e, pathname, "", "top")}
            className={`${tab} ${home ? active : idle}`}>
        {site.nav.explore}
      </Link>
      <Link href="/#kho-game" onClick={(e) => softNav(e, pathname, "", "library")} className={`${tab} ${idle}`}>
        {site.home.libraryTitle}
      </Link>
      {engines.map((e) => {
        const q = `?engine=${encodeURIComponent(e)}`;
        return (
          <Link key={e} href={`/${q}#kho-game`} onClick={(ev) => softNav(ev, pathname, q, "library")} className={`${tab} ${idle}`}>
            {e}
          </Link>
        );
      })}
    </nav>
  );
}
