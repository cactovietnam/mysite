import data from "./games.json";

export const MAX_EXTRA_IMAGES = 10;

export type Game = {
  slug: string;
  title: string;
  engine: string; // Ren'Py, RPGM, Unity, Unreal, Godot... tùy ý
  version: string;
  sizeGB: number;
  cover: string; // ẢNH CHÍNH: hiện ở trang chủ, thẻ game và làm nền trang game
  images: string[]; // ẢNH BỔ SUNG (tối đa 10): để hiểu thêm về game, không gồm ảnh chính
  tags: string[];
  description: string;
  updatedAt: string;
  accent?: string; // màu nhấn #rrggbb, quan_ly.py tự tính từ ảnh chính (thiếu thì web dùng màu hồng mặc định)
  accent2?: string;
  blur?: string; // ảnh mờ 32px dạng data URI: placeholder khi ảnh thật chưa tải xong + nền hero
  links: { label: string; url: string }[];
};

type Raw = Omit<Game, "cover" | "images" | "tags" | "links"> &
  Partial<Pick<Game, "cover" | "images" | "tags" | "links">>;

// Chuẩn hóa dữ liệu cũ: ảnh chính không lặp lại trong ảnh bổ sung, cắt tối đa 10.
export const games: Game[] = (data as unknown as Raw[]).map((g) => {
  const cover = g.cover || g.images?.[0] || "";
  const images = Array.from(new Set(g.images ?? []))
    .filter((u) => u && u !== cover)
    .slice(0, MAX_EXTRA_IMAGES);
  return { ...g, cover, images, tags: g.tags ?? [], links: g.links ?? [] };
});
