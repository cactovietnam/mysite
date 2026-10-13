import { fold } from "./library-filter";

// Nhóm tag + màu nhạt theo loại, dùng tô màu chip trong bộ lọc. Tag không có trong nhóm nào -> màu mặc định.
// Thêm tag mới vào nhóm: sửa mảng tags bên dưới (không phân biệt hoa/thường/dấu).
export type TagGroup = { id: string; label: string; color: string; tags: string[] };

export const TAG_GROUPS: TagGroup[] = [
  { id: "visual", label: "Đồ họa", color: "#60a5fa", tags: ["2DCG", "3DCG", "Animation", "Anime", "Pixel Art"] },
  { id: "gameplay", label: "Lối chơi", color: "#2dd4bf",
    tags: ["Visual Novel", "RPG", "Simulation", "Management", "Adventure", "Puzzle", "Sandbox", "Action", "Turn-Based", "Multiple Endings"] },
  { id: "setting", label: "Bối cảnh", color: "#a78bfa",
    tags: ["Fantasy", "Horror", "Comedy", "School Life", "Slice of Life", "Kung Fu", "Sci-Fi"] },
  { id: "theme", label: "Chủ đề", color: "#ff6b98",
    tags: ["Romance", "Harem", "Vanilla", "Netori", "Cheating", "Corruption", "Mind Control", "Blackmail"] },
  { id: "content", label: "Nội dung", color: "#fb923c",
    tags: ["Femdom", "BDSM", "Futa", "Yuri", "Big Tits", "MILF", "Monster Girl", "Tentacles", "Group Sex", "Erotic", "Eroge"] },
  { id: "meta", label: "Khác", color: "#9ca3af",
    tags: ["Male Protagonist", "Female Protagonist", "Adult", "NSFW", "No AI"] },
];

const DEFAULT_TONE = "#a59dc9";
const TONE_BY_KEY = new Map(TAG_GROUPS.flatMap((g) => g.tags.map((t) => [fold(t), g.color] as const)));

// key = TagInfo.key (đã fold)
export const toneOf = (key: string) => TONE_BY_KEY.get(key) ?? DEFAULT_TONE;
