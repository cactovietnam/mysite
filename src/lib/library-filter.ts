import type { Game } from "@/data/games";

export type SortKey = "new" | "old" | "name" | "size";
export type TagMode = "or" | "and";

export type Filters = {
  engine: string | null; // null = tất cả engine
  q: string; // tìm theo tên game
  tags: string[]; // nhãn chuẩn (TagInfo.label)
  mode: TagMode; // or: có ít nhất 1 tag | and: có đủ mọi tag
  sort: SortKey;
};

export type TagInfo = { key: string; label: string; count: number };

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "Mới cập nhật" },
  { key: "old", label: "Cũ nhất" },
  { key: "name", label: "Tên A đến Z" },
  { key: "size", label: "Dung lượng nhỏ nhất" },
];

// Bỏ dấu + chữ thường: "Đại Hiệp" khớp "dai hiep"; "NTR" khớp "ntr".
export const fold = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();

// Gộp tag gợi ý (presets) với tag thật trong dữ liệu. Trùng (không phân biệt hoa/thường/dấu) thì gộp một.
// Tag có game xếp trước (nhiều game nhất lên đầu), tag chưa có game xuống cuối.
export function buildTagIndex(games: Game[], presets: string[]): TagInfo[] {
  const map = new Map<string, TagInfo>();
  for (const raw of presets) {
    const label = raw.trim();
    const key = fold(label);
    if (key && !map.has(key)) map.set(key, { key, label, count: 0 });
  }
  for (const g of games) {
    const seen = new Set<string>(); // một game ghi tag lặp thì chỉ đếm 1
    for (const raw of g.tags) {
      const label = raw.trim();
      const key = fold(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const hit = map.get(key);
      if (hit) hit.count++;
      else map.set(key, { key, label, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

// Đọc bộ lọc từ query string. Giá trị lạ (engine/tag không tồn tại, sort sai) bị bỏ, không làm hỏng trang.
export function parseFilters(search: string, engines: string[], index: TagInfo[]): Filters {
  const sp = new URLSearchParams(search);
  const engine = sp.get("engine");
  const labelByKey = new Map(index.map((t) => [t.key, t.label]));
  const tags: string[] = [];
  for (const raw of sp.getAll("tag")) {
    const label = labelByKey.get(fold(raw));
    if (label && !tags.includes(label)) tags.push(label);
  }
  const sort = sp.get("sort");
  return {
    engine: engine && engines.includes(engine) ? engine : null,
    q: sp.get("q") ?? "",
    tags,
    mode: sp.get("mode") === "and" ? "and" : "or",
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "new",
  };
}

// Giá trị mặc định không đưa lên URL cho link gọn: /?engine=Unity&tag=Romance&tag=Fantasy
export function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.engine) sp.set("engine", f.engine);
  if (f.q) sp.set("q", f.q);
  for (const t of f.tags) sp.append("tag", t);
  if (f.mode === "and") sp.set("mode", "and");
  if (f.sort !== "new") sp.set("sort", f.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const COMPARE: Record<SortKey, (a: Game, b: Game) => number> = {
  new: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  old: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  name: (a, b) => a.title.localeCompare(b.title, "vi"),
  size: (a, b) => a.sizeGB - b.sizeGB,
};

export function applyFilters(games: Game[], f: Filters): Game[] {
  const q = fold(f.q);
  const want = f.tags.map(fold);
  const out = games.filter((g) => {
    if (f.engine && g.engine !== f.engine) return false;
    if (q && !fold(g.title).includes(q)) return false;
    if (want.length) {
      const have = new Set(g.tags.map(fold));
      const ok = f.mode === "and" ? want.every((k) => have.has(k)) : want.some((k) => have.has(k));
      if (!ok) return false;
    }
    return true;
  });
  // filter() đã tạo mảng mới nên sort tại chỗ không đụng vào mảng gốc
  return out.sort((a, b) => COMPARE[f.sort](a, b) || a.title.localeCompare(b.title, "vi"));
}
