"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Game } from "@/data/games";
import { site } from "@/data/site";
import { applyFilters, buildTagIndex, parseFilters, serializeFilters, type Filters } from "@/lib/library-filter";
import FilterPanel from "./FilterPanel";
import GameCard from "./GameCard";
import { EmptyArt, GhostCard } from "./LibraryArt";

// Bộ lọc đồng bộ với URL (?engine=Unity&tag=Romance&mode=and&q=...&sort=name): chia sẻ được link, nút Back hoạt động.
// Đọc URL bằng useSyncExternalStore: HTML tĩnh vẫn chứa đủ game, client lọc sau khi hydrate.
const EVENT = "filter-change";
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("popstate", cb); window.removeEventListener(EVENT, cb); };
};
const getSearch = () => window.location.search;

// Tag gợi ý sửa trong src/data/site.json -> tagPresets (thiếu mục này thì chỉ hiện tag có trong games.json)
const PRESETS = (site as { tagPresets?: string[] }).tagPresets ?? [];

export default function Library({ games }: { games: Game[] }) {
  const engines = useMemo(() => Array.from(new Set(games.map((g) => g.engine))), [games]);
  const tagIndex = useMemo(() => buildTagIndex(games, PRESETS), [games]);
  const search = useSyncExternalStore(subscribe, getSearch, () => "");
  const filters = useMemo(() => parseFilters(search, engines, tagIndex), [search, engines, tagIndex]);
  const list = useMemo(() => applyFilters(games, filters), [games, filters]);
  const [panelOpen, setPanelOpen] = useState(false); // chỉ dùng trên điện thoại/tablet

  const dirty = filters.engine !== null || filters.q.trim() !== "" || filters.tags.length > 0;
  const badge = filters.tags.length + (filters.q.trim() ? 1 : 0);

  // replace=true cho ô gõ chữ: không đẩy mỗi phím vào lịch sử Back
  const update = (patch: Partial<Filters>, replace = false) => {
    const { pathname, hash } = window.location;
    const url = pathname + serializeFilters({ ...filters, ...patch }) + hash;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(EVENT));
  };
  const clear = () => update({ engine: null, q: "", tags: [] });

  const chip = (id: string, label: string, count: number) => {
    const on = (filters.engine ?? "all") === id;
    return (
      <button key={id} onClick={() => update({ engine: id === "all" ? null : id })} aria-pressed={on}
              className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
                on ? "bg-mist text-ink" : "glass text-mist/80 hover:bg-white/10 hover:text-mist"}`}>
        {label} <span className={on ? "text-ink/55" : "text-haze"}>{count}</span>
      </button>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
      {/* Cột lọc: bên phải trên máy tính, trên điện thoại nằm trên lưới và thu gọn được */}
      <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
        <button type="button" onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen} aria-controls="bo-loc"
                className="glass inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15 active:scale-95 lg:hidden">
          Bộ lọc
          {badge > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-berry px-1.5 text-xs text-ink">{badge}</span>}
        </button>
        <div id="bo-loc" className={`${panelOpen ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}>
          <FilterPanel filters={filters} tagIndex={tagIndex} dirty={dirty} onChange={update} onClear={clear}
                       className="lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" />
        </div>
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-2.5">
            {chip("all", "Tất cả", games.length)}
            {engines.map((e) => chip(e, e, games.filter((g) => g.engine === e).length))}
          </div>
          <p aria-live="polite" className="text-sm text-haze">{list.length} game</p>
        </div>

        {list.length > 0 ? (
          <div key={filters.engine ?? "all"} className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((g, i) => (
              // stagger: thẻ vào lần lượt, trần 8 nhịp để danh sách dài không phải chờ
              <div key={g.slug} className="anim-pop" style={{ "--d": `${Math.min(i, 8) * 55}ms` } as React.CSSProperties}>
                <GameCard game={g} />
              </div>
            ))}
            {!dirty && Array.from({ length: Math.max(0, 3 - list.length) }, (_, i) => <GhostCard key={`ghost-${i}`} />)}
          </div>
        ) : (
          <div className="glass grid place-items-center rounded-[1.75rem] px-6 py-14 text-center">
            <EmptyArt />
            <p className="mt-4 font-display text-xl font-bold">Không có game nào khớp bộ lọc</p>
            <p className="mt-2 max-w-[40ch] text-sm text-haze">Thử bỏ bớt tag, đổi sang &ldquo;Hoặc&rdquo; hoặc gõ tên khác.</p>
            {dirty && (
              <button type="button" onClick={clear}
                      className="mt-6 rounded-full bg-berry px-6 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 active:scale-95">
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
