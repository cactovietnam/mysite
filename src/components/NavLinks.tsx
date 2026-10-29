"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/data/site";
import { donateConfig, donateNavLabel } from "@/data/donate";
import { softNav } from "@/lib/soft-nav";

const tab =
  "relative flex h-14 shrink-0 items-center gap-1.5 px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-[2.5px] after:origin-center after:rounded-full after:bg-gradient-to-r after:from-[#5eead4] after:to-[#38bdf8] after:transition-transform after:duration-300";
const idle = "text-slate-400 after:scale-x-0 hover:text-mist hover:after:scale-x-100";
const active = "text-mist after:scale-x-100";
// Tab Donate: chữ + icon màu berry, gạch chân sáng lên khi đang ở /donate hoặc rê chuột.
const donateTab = "gap-1.5 font-semibold text-[#e85d88] hover:after:scale-x-100";

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const COMPASS = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3-12-2 5-5 2 2-5 5-2Z";
const PAD = "M6 8h12a4 4 0 0 1 4 4v3a2.5 2.5 0 0 1-4.3 1.7L16 15H8l-1.7 1.7A2.5 2.5 0 0 1 2 15v-3a4 4 0 0 1 4-4ZM8 10.5v3M6.5 12h3M16 11.5h.01M18 13h.01";
const SPARKLES = "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z";
const SWORDS = "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2";
const ENGINE_ICON: Record<string, string> = { "Ren'Py": SPARKLES, RPGM: SWORDS }; // engine khác dùng khối hộp
const CUBE = "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9";

export default function NavLinks({ engines }: { engines: string[] }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const isDonate = pathname === "/donate";

  return (
    <nav aria-label="Chính" className="hidden min-w-0 flex-1 justify-center overflow-x-auto [scrollbar-width:none] md:flex">
      <Link href="/" aria-current={home ? "page" : undefined} onClick={(e) => softNav(e, pathname, "", "top")}
            className={`${tab} ${home ? active : idle}`}>
        <span className={home ? "text-[#5eead4]" : ""}><Ico d={COMPASS} /></span>{site.nav.explore}
      </Link>
      <Link href="/#kho-game" onClick={(e) => softNav(e, pathname, "", "library")} className={`${tab} ${idle}`}>
        <Ico d={PAD} />{site.home.libraryTitle}
      </Link>
      {engines.map((e) => {
        const q = `?engine=${encodeURIComponent(e)}`;
        return (
          <Link key={e} href={`/${q}#kho-game`} onClick={(ev) => softNav(ev, pathname, q, "library")} className={`${tab} ${idle}`}>
            <Ico d={ENGINE_ICON[e] ?? CUBE} />{e}
          </Link>
        );
      })}
      {donateConfig.enabled && (
        <Link href="/donate" aria-current={isDonate ? "page" : undefined}
              className={`${tab} ${donateTab} ${isDonate ? "after:scale-x-100" : "after:scale-x-0"}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
          </svg>
          {donateNavLabel}
        </Link>
      )}
    </nav>
  );
}
