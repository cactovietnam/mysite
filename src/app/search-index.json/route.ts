import { games, thumbOf } from "@/data/games";

// Chỉ mục nhẹ cho ô tìm kiếm (Ctrl K): chỉ những trường cần để tìm và hiện kết quả.
// Sinh lúc build từ games.json nên không bao giờ lệch dữ liệu. Mô tả, link, ảnh mờ không nằm trong đây.
export function GET() {
  const items = [...games]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((g) => ({ slug: g.slug, title: g.title, engine: g.engine, version: g.version, tags: g.tags, thumb: thumbOf(g) }));
  return Response.json(items);
}
