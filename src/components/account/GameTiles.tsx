"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Cover from "@/components/Cover";

export type Meta = { slug: string; title: string; engine: string; version: string; tags: string[]; thumb: string };

// Chỉ mục nhẹ /search-index.json (sắp theo ngày cập nhật mới nhất), tải một lần dùng chung cho các trang tài khoản.
let pending: Promise<Meta[]> | null = null;
const loadIndex = () => (pending ??= fetch("/search-index.json")
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Meta[]>; })
  .catch((e) => { pending = null; throw e; }));

export function useGameIndex() {
  const [m, setM] = useState<Meta[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let dead = false;
    loadIndex().then((x) => { if (!dead) setM(x); }, () => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, []);
  return { games: m, failed };
}

export const selectCls =
  "w-full rounded-xl bg-white/[0.07] px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-haze focus:bg-white/10 focus-visible:ring-2 focus-visible:ring-berry";

export function PageHead({ eyebrow, title, desc, aside }: { eyebrow: string; title: string; desc?: string; aside?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-berry">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-haze">{desc}</p>}
      </div>
      {aside}
    </header>
  );
}

export function GameTiles({ games, empty }: { games: Meta[]; empty: string }) {
  if (games.length === 0) return <p className="glass rounded-3xl px-6 py-14 text-center text-sm text-haze">{empty}</p>;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {games.map((g) => (
        <li key={g.slug}>
          <Link href={`/game/${g.slug}`} className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-[#5eead4]/50">
            <div className="relative aspect-video bg-plum">
              <Cover src={g.thumb} title={g.title} engine={g.engine} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-3.5">
              <p className="line-clamp-2 font-display text-base font-bold leading-snug">{g.title}</p>
              <p className="mt-1 text-xs tabular-nums text-haze">{g.engine} · v{g.version}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
