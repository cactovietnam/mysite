// Màu theo engine: mỗi engine một màu để nhận ra ngay trên thẻ, huy hiệu và ánh sáng quanh ảnh.
const ENGINE_COLOR: Record<string, string> = {
  "Ren'Py": "#a78bfa",
  RPGM: "#2dd4bf",
  Unity: "#60a5fa",
  Unreal: "#fbbf24",
};

export const engineColor = (engine: string) => ENGINE_COLOR[engine] ?? "#9d94c4";

// "2026-10-12" -> "12/10/2026" (không dùng Date để tránh lệch múi giờ)
export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
