import { fold } from "./library-filter";
import data from "@/data/tags.json";

// Nhóm tag + màu nhạt theo loại, dùng tô màu chip trong bộ lọc. Tag không có trong nhóm nào -> màu mặc định.
// Danh mục nằm ở src/data/tags.json (cũng là nguồn gợi ý tag của quan_ly.py). Thêm tag: sửa mảng tags trong file đó
// (không phân biệt hoa/thường/dấu).
export type TagGroup = { id: string; label: string; color: string; tags: string[] };

export const TAG_GROUPS: TagGroup[] = data.groups;

const DEFAULT_TONE = "#9fb0c8";
const TONE_BY_KEY = new Map(TAG_GROUPS.flatMap((g) => g.tags.map((t) => [fold(t), g.color] as const)));

// key = TagInfo.key (đã fold)
export const toneOf = (key: string) => TONE_BY_KEY.get(key) ?? DEFAULT_TONE;
