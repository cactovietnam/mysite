"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { site } from "@/data/site";
import SearchBox from "./SearchBox";

// Đồng bộ với Library: Library nghe "filter-change" + popstate để đọc ?engine=... từ URL.
const EVENT = "filter-change";
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("popstate", cb); window.removeEventListener("hashchange", cb); window.removeEventListener(EVENT, cb); };
};
const getLoc = () => window.location.search + window.location.hash;

type Tab = { id: string; label: string; href: string; active: boolean };

export default function NavTabs({ engines }: { engines: string[] }) {
  const pathname = usePathname();
  const loc = useSyncExternalStore(subscribe, getLoc, () => "");
  const [query, hash = ""] = loc.split("#");
  const engine = new URLSearchParams(query).get("engine");
  const home = pathname === "/";
  const fresh = home && !engine;

  const tabs: Tab[] = [
    { id: "home", label: site.nav.explore, href: "/", active: fresh && !hash },
    { id: "new", label: site.home.featuredBadge, href: "/#kho-game", active: fresh && hash === "kho-game" },
    ...engines.map((e) => ({
      id: e, label: e, href: `/?engine=${encodeURIComponent(e)}#kho-game`, active: home && engine === e,
    })),
  ];

  // Đang ở trang chủ: đổi URL tại chỗ (Library lọc ngay, không tải lại). Trang khác: để Link điều hướng.
  const onClick = (e: React.MouseEvent, href: string) => {
    if (!home || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    window.history.pushState(null, "", href);
    window.dispatchEvent(new Event(EVENT));
    const id = href.split("#")[1];
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const link = "relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition";

  return (
    <div className="sticky top-4 z-40 px-4">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        {/* SearchBox nằm NGOÀI .glass: backdrop-filter biến .glass thành khung chứa của phần tử fixed, hộp tìm kiếm sẽ bị kẹt trong thanh */}
        <nav aria-label="Điều hướng chính" className="glass edge flex min-w-0 flex-1 rounded-full p-1.5 shadow-lg shadow-black/20">
          <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              // ml-auto / mr-auto ở đầu và cuối: căn giữa khi vừa chỗ, vẫn cuộn được tới tab đầu khi tràn (justify-center sẽ cắt mất)
              <li key={t.id} className="shrink-0 first:ml-auto last:mr-auto">
                <Link href={t.href} onClick={(e) => onClick(e, t.href)} aria-current={t.active ? "page" : undefined}
                      className={`${link} ${t.active ? "bg-white/10 text-mist" : "text-mist/70 hover:bg-white/10 hover:text-mist"}`}>
                  {t.label}
                  {t.active && <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-berry to-[#7c5cff]" />}
                </Link>
              </li>
            ))}
            {/^https?:\/\//i.test(site.discord) && (
              <li className="hidden shrink-0 sm:block">
                <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${link} text-mist/70 hover:bg-white/10 hover:text-mist`}>
                  {site.nav.discord}
                </a>
              </li>
            )}
          </ul>
        </nav>
        <SearchBox />
      </div>
    </div>
  );
}
