"use client";
import { useId, useState } from "react";
import { SORTS, fold, type Filters, type SortKey, type TagInfo } from "@/lib/library-filter";
import { toneOf } from "@/lib/tag-groups";

type Props = {
  filters: Filters;
  tagIndex: TagInfo[];
  dirty: boolean; // đang có lọc nào đó (engine, tên, tag)
  onChange: (patch: Partial<Filters>, replace?: boolean) => void;
  onClear: () => void;
  className?: string;
};

// Ô nhập dùng chung. Không dùng .glass/.chip ở đây vì chúng là CSS ngoài layer, sẽ đè các class bg-* của Tailwind.
const field =
  "w-full rounded-xl bg-white/[0.07] px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-haze focus:bg-white/10 focus-visible:ring-2 focus-visible:ring-berry";

// Chip tag: tô nhạt theo nhóm (đồ họa, lối chơi, bối cảnh...); đã chọn thì đặc màu + glow
const chipStyle = (c: string, on: boolean): React.CSSProperties =>
  on
    ? { background: c, borderColor: c, color: "#0f0c1a", boxShadow: `0 0 16px -2px ${c}` }
    : { background: `${c}1f`, borderColor: `${c}47`, color: "#efeaff" };

export default function FilterPanel({ filters, tagIndex, dirty, onChange, onClear, className = "" }: Props) {
  const uid = useId();
  const [tagQ, setTagQ] = useState("");

  const needle = fold(tagQ);
  const visible = needle ? tagIndex.filter((t) => t.key.includes(needle)) : tagIndex;
  const chosen = new Set(filters.tags);

  const toggle = (label: string) =>
    onChange({ tags: chosen.has(label) ? filters.tags.filter((t) => t !== label) : [...filters.tags, label] });

  return (
    <section aria-label="Bộ lọc game" className={`glass divide-y divide-white/10 rounded-[1.75rem] ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="neon-title font-display text-lg font-bold tracking-tight">Bộ lọc</h2>
        {dirty && (
          <button type="button" onClick={() => { onClear(); setTagQ(""); }}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-berry transition hover:bg-white/10">
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        <label htmlFor={`${uid}-q`} className="mb-2 block text-sm font-semibold">Tên game</label>
        <input id={`${uid}-q`} type="search" autoComplete="off" value={filters.q} placeholder="Nhập tên game"
               onChange={(e) => onChange({ q: e.target.value }, true)} className={field} />
      </div>

      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">
            Tag{filters.tags.length > 0 && <span className="ml-1.5 text-berry">{filters.tags.length}</span>}
          </h3>
          <div role="group" aria-label="Cách ghép tag" className="inline-flex rounded-full bg-white/[0.07] p-0.5 text-xs font-semibold">
            {(["or", "and"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={filters.mode === m} onClick={() => onChange({ mode: m })}
                      className={`rounded-full px-3.5 py-1 transition ${
                        filters.mode === m ? "bg-berry text-ink" : "text-mist/70 hover:text-mist"}`}>
                {m === "or" ? "Hoặc" : "Và"}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor={`${uid}-t`} className="sr-only">Tìm tag</label>
        <input id={`${uid}-t`} type="search" autoComplete="off" value={tagQ} placeholder="Tìm tag"
               onChange={(e) => setTagQ(e.target.value)} className={field} />

        <ul className="mt-3 flex max-h-64 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin]">
          {visible.map((t) => {
            const on = chosen.has(t.label);
            return (
              <li key={t.key}>
                <label className="block cursor-pointer has-[:disabled]:cursor-not-allowed">
                  <input type="checkbox" className="peer sr-only" checked={on}
                         disabled={!on && t.count === 0} onChange={() => toggle(t.label)} />
                  <span style={chipStyle(toneOf(t.key), on)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition peer-disabled:opacity-40 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:brightness-125">
                    {t.label}
                    <span className={on ? "text-ink/60" : "text-haze"}>{t.count}</span>
                  </span>
                </label>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-1 py-3 text-sm text-haze">Không có tag nào khớp.</li>}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-haze">
          {filters.mode === "or" ? "Hiện game có ít nhất một tag đã chọn." : "Chỉ hiện game có đủ mọi tag đã chọn."}
        </p>
      </div>

      <div className="px-5 py-4">
        <label htmlFor={`${uid}-s`} className="mb-2 block text-sm font-semibold">Sắp xếp</label>
        <div className="relative">
          <select id={`${uid}-s`} value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}
                  className={`${field} appearance-none pr-10`}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-haze"
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 8 5 5 5-5" />
          </svg>
        </div>
      </div>
    </section>
  );
}
