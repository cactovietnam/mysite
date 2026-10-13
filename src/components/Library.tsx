"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Game } from "@/data/games";
import GameCard from "./GameCard";

// Bộ lọc engine đồng bộ với URL (?engine=Unity): chia sẻ được link, nút Back hoạt động.
// Đọc URL bằng useSyncExternalStore: HTML tĩnh vẫn chứa đủ game, client lọc sau khi hydrate.
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener("engine-change", cb);
  return () => { window.removeEventListener("popstate", cb); window.removeEventListener("engine-change", cb); };
};
const getSearch = () => window.location.search;

export default function Library({ games }: { games: Game[] }) {
  const engines = useMemo(() => Array.from(new Set(games.map((g) => g.engine))), [games]);
  const search = useSyncExternalStore(subscribe, getSearch, () => "");
  const wanted = new URLSearchParams(search).get("engine");
  const active = wanted && engines.includes(wanted) ? wanted : "all";
  const list = active === "all" ? games : games.filter((g) => g.engine === active);

  const select = (id: string) => {
    const { pathname, hash } = window.location;
    const query = id === "all" ? "" : `?engine=${encodeURIComponent(id)}`;
    window.history.pushState(null, "", pathname + query + hash);
    window.dispatchEvent(new Event("engine-change"));
  };

  const chip = (id: string, label: string, count: number) => (
    <button key={id} onClick={() => select(id)} aria-pressed={active === id}
            className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
              active === id ? "bg-mist text-ink" : "glass text-mist/80 hover:bg-white/10 hover:text-mist"}`}>
      {label} <span className={active === id ? "text-ink/55" : "text-haze"}>{count}</span>
    </button>
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2.5">
        {chip("all", "Tất cả", games.length)}
        {engines.map((e) => chip(e, e, games.filter((g) => g.engine === e).length))}
      </div>
      <div key={active} className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4 lg:grid-cols-5">
        {list.map((g) => (
          <div key={g.slug} className="anim-pop"><GameCard game={g} /></div>
        ))}
      </div>
    </>
  );
}
