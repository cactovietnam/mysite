"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/data/site";

// Phải trùng hằng EVENT trong Library.tsx: báo cho bộ lọc đọc lại URL sau khi ta tự pushState.
const FILTER_EVENT = "filter-change";

const tab =
  "relative flex h-14 shrink-0 items-center px-3.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-center after:rounded-full after:bg-gradient-to-r after:from-berry after:to-[#7c5cff] after:transition-transform after:duration-300";
const idle = "text-mist/70 after:scale-x-0 hover:text-mist hover:after:scale-x-100";
const active = "text-mist after:scale-x-100";

// Đang ở trang chủ thì đổi bộ lọc tại chỗ (không tải lại trang, không hỏi lại cổng 18+); trang khác thì để Link tự điều hướng.
function soft(e: React.MouseEvent, pathname: string, search: string, target: "top" | "library") {
  if (pathname !== "/" || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  window.history.pushState(null, "", `/${search}${target === "library" ? "#kho-game" : ""}`);
  window.dispatchEvent(new Event(FILTER_EVENT));
  if (target === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else document.getElementById("kho-game")?.scrollIntoView({ behavior: "smooth" });
}

export default function NavLinks({ engines }: { engines: string[] }) {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <nav aria-label="Chính" className="hidden min-w-0 flex-1 justify-center overflow-x-auto [scrollbar-width:none] md:flex">
      <Link href="/" aria-current={home ? "page" : undefined} onClick={(e) => soft(e, pathname, "", "top")}
            className={`${tab} ${home ? active : idle}`}>
        {site.nav.explore}
      </Link>
      <Link href="/#kho-game" onClick={(e) => soft(e, pathname, "", "library")} className={`${tab} ${idle}`}>
        {site.home.libraryTitle}
      </Link>
      {engines.map((e) => {
        const q = `?engine=${encodeURIComponent(e)}`;
        return (
          <Link key={e} href={`/${q}#kho-game`} onClick={(ev) => soft(ev, pathname, q, "library")} className={`${tab} ${idle}`}>
            {e}
          </Link>
        );
      })}
    </nav>
  );
}
