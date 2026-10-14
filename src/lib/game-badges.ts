import { fold } from "./library-filter";

// Tag đặc biệt hiện thành huy hiệu trên thẻ game (không phân biệt hoa/thường/dấu):
//   "Việt hóa" -> huy hiệu "Việt hóa" cạnh engine
//   "Cheat"    -> có cả Việt hóa thì gộp "VH&Cheat", không thì hiện riêng "Cheat"
//   "18+"      -> nhãn đỏ góc phải dưới ảnh
const VH = new Set(["viet hoa", "viethoa", "vh"]);
const CHEAT = new Set(["cheat"]);
const ADULT = new Set(["18+"]);

export type PatchBadge = { label: string; from: string; to: string };

const TEAL = "#2dd4bf";
const AMBER = "#fbbf24";

export function gameBadges(tags: string[]): { adult: boolean; patch: PatchBadge | null } {
  const keys = tags.map(fold);
  const vh = keys.some((k) => VH.has(k));
  const cheat = keys.some((k) => CHEAT.has(k));
  const adult = keys.some((k) => ADULT.has(k));
  const patch: PatchBadge | null =
    vh && cheat ? { label: "VH&Cheat", from: TEAL, to: AMBER }
    : vh ? { label: "Việt hóa", from: TEAL, to: TEAL }
    : cheat ? { label: "Cheat", from: AMBER, to: AMBER }
    : null;
  return { adult, patch };
}

// Tag đã thể hiện bằng huy hiệu thì không lặp lại trong danh sách tag hiện khi rê chuột.
export const isBadgeTag = (tag: string) => {
  const k = fold(tag);
  return VH.has(k) || CHEAT.has(k) || ADULT.has(k);
};
