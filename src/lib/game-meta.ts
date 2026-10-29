import { useEffect, useState } from "react";

// Tên + ảnh nhỏ của game lấy từ /search-index.json (nhẹ, đã có sẵn). Không import data/games vào client để header
// (có giỏ hàng) không kéo cả games.json vào mọi trang.
export type GameMeta = { slug: string; title: string; thumb: string };
let pending: Promise<Map<string, GameMeta>> | null = null;
export function loadGameMeta(): Promise<Map<string, GameMeta>> {
  pending ??= fetch("/search-index.json")
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<GameMeta[]>; })
    .then((a) => new Map(a.map((g) => [g.slug, g] as const)))
    .catch((e) => { pending = null; throw e; });
  return pending;
}
const EMPTY = new Map<string, GameMeta>();
export function useGameMeta(active = true) {
  const [m, setM] = useState(EMPTY);
  useEffect(() => {
    if (!active) return;
    let dead = false;
    loadGameMeta().then((x) => { if (!dead) setM(x); }, () => { /* thiếu ảnh/tên thì dùng slug */ });
    return () => { dead = true; };
  }, [active]);
  return m;
}
