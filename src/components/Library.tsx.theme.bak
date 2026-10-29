"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { GameCardData } from "@/data/games";
import { site } from "@/data/site";
import { useList } from "@/lib/user-lists";
import { applyFilters, buildTagIndex, parseFilters, serializeFilters, type Filters } from "@/lib/library-filter";
import FilterPanel from "./FilterPanel";
import GameCard from "./GameCard";
import { EmptyArt, GhostCard } from "./LibraryArt";
import Pagination from "./Pagination";
import { engineColor, isHex, onColor } from "@/lib/game-ui";

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
const PAGE_SIZE = 15; // số game mỗi trang
const PRESETS = (site as { tagPresets?: string[] }).tagPresets ?? [];

export default function Library({ games }: { games: GameCardData[] }) {
  const engines = useMemo(() => Array.from(new Set(games.map((g) => g.engine))), [games]);
  const tagIndex = useMemo(() => buildTagIndex(games, PRESETS), [games]);
  const search = useSyncExternalStore(subscribe, getSearch, () => "");
  const filters = useMemo(() => parseFilters(search, engines, tagIndex), [search, engines, tagIndex]);
  const fav = useList("fav");
  const alive = (l: string[]) => l.filter((s) => games.some((g) => g.slug === s)).length; // bỏ qua game đã xóa
  const seen = useList("seen");
  const list = useMemo(() => {
    const out = applyFilters(games, filters);
    if (filters.list === "all") return out;
    const keep = filters.list === "fav" ? fav : seen; // thứ tự trong danh sách = mới nhất trước
    const rank = new Map(keep.map((s, i) => [s, i]));
    const hit = out.filter((g) => rank.has(g.slug));
    return filters.list === "seen" ? hit.sort((a, b) => rank.get(a.slug)! - rank.get(b.slug)!) : hit;
  }, [games, filters, fav, seen]);
  const [panelOpen, setPanelOpen] = useState(false); // chỉ dùng trên điện thoại/tablet
  // Trang nằm trong URL (?page=2). Kẹp lại nếu link cũ trỏ quá số trang hiện có (vd lọc xong còn ít game).
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dirty = filters.list !== "all" || filters.engine !== null || filters.q.trim() !== "" || filters.tags.length > 0;
  const badge = filters.tags.length + (filters.q.trim() ? 1 : 0);

  // replace=true cho ô gõ chữ: không đẩy mỗi phím vào lịch sử Back
  const update = (patch: Partial<Filters>, replace = false) => {
    const { pathname, hash } = window.location;
    const url = pathname + serializeFilters({ ...filters, page: 1, ...patch }) + hash; // đổi bộ lọc nào cũng về trang 1, trừ khi patch chỉ định page
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(EVENT));
  };
  // Đổi danh sách có hiệu ứng: lưới mờ đi + trượt xuống nhẹ (150ms), đổi nội dung rồi các thẻ hiện lần lượt. Bấm dồn trong lúc đang chạy thì bỏ qua.
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  const swap = (fn: () => void) => {
    if (busy.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { fn(); return; }
    busy.current = true; setLeaving(true);
    setTimeout(() => { fn(); setLeaving(false); busy.current = false; }, 150);
  };
  const goPage = (p: number) => {
    document.getElementById("kho-game")?.scrollIntoView({ block: "start", behavior: "smooth" }); // cuộn mượt về đầu kho game trong lúc lưới đang mờ
    swap(() => update({ page: p }));
  };
  const clear = () => update({ engine: null, q: "", tags: [], list: "all" });

  // Mỗi chip một màu riêng: engine lấy màu engine (site.json), Yêu thích = hồng san hô, Đã xem = xanh trời, Tất cả = tím -> hồng đậm.
  // Chưa chọn: nền + viền nhạt pha màu, chữ sáng, số theo màu. Đã chọn: đặc màu + glow, chữ tự chọn sáng/tối theo độ tương phản.
  const tone = (c: string, on: boolean): React.CSSProperties => {
    if (!on) return { background: `${c}1a`, borderColor: `${c}4d`, color: "#efeaff" };
    const fg = onColor(c);
    return { background: c, borderColor: c, color: fg, boxShadow: `0 8px 24px -8px ${c}, 0 0 0 1px ${c}` };
  };
  const base = "rounded-full border px-4 py-2 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 active:scale-95";

  const chip = (id: string, label: string, count: number) => {
    const on = (filters.engine ?? "all") === id;
    if (id === "all") {
      return (
        <button key={id} onClick={() => swap(() => update({ engine: null }))} aria-pressed={on}
                className={`${base} ${on ? "border-transparent bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white shadow-[0_8px_24px_-8px_#db2777]" : "border-[#a78bfa]/30 bg-[#a78bfa]/10 text-mist hover:bg-[#a78bfa]/20"}`}>
          {label} <span className={on ? "text-white/70" : "text-[#c4b5fd]"}>{count}</span>
        </button>
      );
    }
    const raw = engineColor(id);
    const c = isHex(raw) ? raw : "#a78bfa";
    return (
      <button key={id} onClick={() => swap(() => update({ engine: id }))} aria-pressed={on} style={tone(c, on)}
              className={`${base} ${on ? "" : "hover:brightness-125"}`}>
        {label} <span style={{ color: on ? undefined : c, opacity: on ? 0.65 : 1 }}>{count}</span>
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
            {([["fav", "Yêu thích", alive(fav), "#fb7185"], ["seen", "Đã xem", alive(seen), "#38bdf8"]] as const).filter(([k]) => filters.list === k).map(([k, label, n, c]) => {
              const on = filters.list === k;
              return (
                <button key={k} onClick={() => swap(() => update({ list: on ? "all" : k }))} aria-pressed={on} style={tone(c, on)}
                        className={`${base} ${on ? "" : "hover:brightness-125"}`}>
                  {label} <span style={{ color: on ? undefined : c, opacity: on ? 0.65 : 1 }}>{n}</span>
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className="text-sm text-haze">{list.length} game</p>
        </div>

        {list.length > 0 ? (
          <div className={`transition-[opacity,transform] duration-150 ease-out ${leaving ? "translate-y-2 opacity-0" : ""}`}>
            {/* key gồm mọi bộ lọc trừ ô gõ tên: đổi lọc/trang thì các thẻ hiện lại lần lượt, còn gõ chữ thì không nhấp nháy */}
            <div key={`${filters.engine ?? "all"}|${filters.list}|${filters.sort}|${filters.mode}|${filters.tags.join(",")}|${page}`} className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((g, i) => (
                // stagger: thẻ vào lần lượt, trần 6 nhịp, mỗi nhịp 35ms để danh sách dài không phải chờ
                <div key={g.slug} className="anim-pop" style={{ "--d": `${Math.min(i, 6) * 35}ms` } as React.CSSProperties}>
                  <GameCard game={g} />
                </div>
              ))}
              {!dirty && Array.from({ length: Math.max(0, 3 - list.length) }, (_, i) => <GhostCard key={`ghost-${i}`} />)}
            </div>
            <Pagination page={page} pages={pages} total={list.length} size={PAGE_SIZE} onPage={goPage} />
          </div>
        ) : (
          <div className="glass grid place-items-center rounded-[1.75rem] px-6 py-14 text-center">
            <EmptyArt />
            <p className="mt-4 font-display text-xl font-bold">Không có game nào khớp bộ lọc</p>
            <p className="mt-2 max-w-[40ch] text-sm text-haze">{filters.list === "fav" ? "Bấm biểu tượng tim trên thẻ game để lưu vào đây." : filters.list === "seen" ? "Game bạn mở xem sẽ hiện ở đây." : "Thử bỏ bớt tag, đổi sang \u201cHoặc\u201d hoặc gõ tên khác."}</p>
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
