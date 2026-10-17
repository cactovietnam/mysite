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
  intro: string; // SƠ LƯỢC ngắn (1-2 câu), hiện NGOÀI game: slider trang chủ + đầu trang game. Trống thì lấy khổ đầu của content
  content: string[]; // NỘI DUNG GAME: mỗi phần tử là 1 khổ văn bản (quan_ly.py: Enter = sang khổ mới)
  updatedAt: string;
  accent?: string; // màu nhấn #rrggbb, quan_ly.py tự tính từ ảnh chính (thiếu thì web dùng màu hồng mặc định)
  accent2?: string;
  thumb?: string; // ảnh chính bản nhỏ 640px (quan_ly.py sinh): thẻ game, tìm kiếm, game tương tự. Thiếu thì dùng cover
  blur?: string; // ảnh mờ 32px dạng data URI: placeholder khi ảnh thật chưa tải xong + nền hero
  links: { label: string; url: string }[];
};

// Dữ liệu nhẹ cho danh sách/thẻ game (client component): bỏ các trường nặng chỉ trang chi tiết mới cần.
// Danh sách trắng có chủ ý: thêm trường nặng mới vào Game sẽ không tự lọt vào payload trang chủ.
export type GameCardData = Omit<Game, "intro" | "content" | "images" | "links">;

export const toCard = (g: Game): GameCardData => ({
  slug: g.slug, title: g.title, engine: g.engine, version: g.version, sizeGB: g.sizeGB,
  cover: g.cover, thumb: g.thumb, blur: g.blur, accent: g.accent, accent2: g.accent2,
  tags: g.tags, updatedAt: g.updatedAt,
});

// Slider trang chủ chỉ cần câu sơ lược: không đẩy cả nội dung dài xuống client.
export type SlideData = GameCardData & { summary: string };
export const summaryOf = (g: Pick<Game, "intro" | "content">) => g.intro || g.content[0] || "";
export const toSlide = (g: Game): SlideData => ({ ...toCard(g), summary: summaryOf(g) });

// Mô tả cho SEO / Open Graph: tối đa ~160 ký tự.
export const metaDescription = (g: Pick<Game, "intro" | "content">) => {
  const t = summaryOf(g);
  return t.length > 160 ? t.slice(0, 157).trimEnd() + "…" : t;
};

export const thumbOf = (g: Pick<Game, "thumb" | "cover">) => g.thumb || g.cover;

// description = trường cũ (1 chuỗi). Dữ liệu chưa chạy lại quan_ly.py vẫn hiển thị đúng: tự đổi thành content.
type Raw = Omit<Game, "cover" | "images" | "tags" | "links" | "intro" | "content"> &
  Partial<Pick<Game, "cover" | "images" | "tags" | "links" | "intro" | "content">> & { description?: string };

// Mảng khổ (hoặc chuỗi cũ, tách theo dòng) -> mảng khổ sạch, bỏ khổ rỗng.
const paragraphs = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\r?\n/) : []).map((p) => String(p).trim()).filter(Boolean);

// Chuẩn hóa dữ liệu cũ: ảnh chính không lặp lại trong ảnh bổ sung, cắt tối đa 10.
export const games: Game[] = (data as unknown as Raw[]).map(({ description, ...g }) => {
  const cover = g.cover || g.images?.[0] || "";
  const images = Array.from(new Set(g.images ?? []))
    .filter((u) => u && u !== cover)
    .slice(0, MAX_EXTRA_IMAGES);
  const content = paragraphs(g.content?.length ? g.content : description);
  return { ...g, cover, images, tags: g.tags ?? [], links: g.links ?? [], intro: (g.intro ?? "").trim(), content };
});
