import type { CSSProperties } from "react";
import type { Game } from "@/data/games";
import { site } from "@/data/site";

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

// Màu theo engine: mỗi engine một màu để nhận ra ngay trên thẻ, huy hiệu và ánh sáng quanh ảnh.
const ENGINE_COLOR: Record<string, string> = site.engines; // sửa/thêm màu trong src/data/site.json
const ENGINE_ALIAS: Record<string, string> = { "RPG Maker": "RPGM", RPGMaker: "RPGM", "Ren'py": "Ren'Py", Renpy: "Ren'Py" };

export const engineColor = (engine: string) => ENGINE_COLOR[engine] ?? ENGINE_COLOR[ENGINE_ALIAS[engine] ?? ""] ?? "#a78bfa";

// ---------- màu nhấn theo game ----------
export const FALLBACK_ACCENT = "#ee5a96";
const FALLBACK_ACCENT2 = "#9d6bf0";
const DARK = "#0f0c1a";

const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const DARK_L = luminance(DARK);

// Chữ trên nền accent: chọn tối hoặc trắng, cái nào tương phản cao hơn (luôn >= 4.5 với accent do quan_ly.py sinh)
export const onColor = (bg: string) => (ratio(luminance(bg), DARK_L) >= ratio(luminance(bg), 1) ? DARK : "#ffffff");

export const accentHex = (g: Pick<Game, "accent">) => (isHex(g.accent) ? g.accent : FALLBACK_ACCENT);

// Gắn vào style của khối bọc: nút, glow, viền chip trong khối lấy --accent / --accent2 / --on-accent
export const accentStyle = (g: Pick<Game, "accent" | "accent2">): CSSProperties => {
  const a = accentHex(g);
  const a2 = isHex(g.accent2) ? g.accent2 : FALLBACK_ACCENT2;
  return { "--accent": a, "--accent2": a2, "--on-accent": onColor(a) } as CSSProperties;
};

// Số ngày từ ngày cập nhật đến hôm nay (theo giờ máy người xem). Ngày sai định dạng -> Infinity.
export const daysSince = (iso: string, now = new Date()) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return Infinity;
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
};

// "2026-10-12" -> "12/10/2026" (không dùng Date để tránh lệch múi giờ)
export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

// Nhận diện nơi lưu file từ link tải (tên + màu để hiện đẹp trong bảng tải xuống)
const PROVIDERS: [RegExp, string, string][] = [
  [/gofile\.io/, "Gofile", "#38bdf8"],
  [/drive\.google|docs\.google/, "Google Drive", "#facc15"],
  [/mega\.(nz|io)/, "MEGA", "#f87171"],
  [/mediafire/, "MediaFire", "#60a5fa"],
  [/pixeldrain/, "Pixeldrain", "#a3e635"],
  [/1fichier/, "1Fichier", "#fb923c"],
  [/dropbox/, "Dropbox", "#60a5fa"],
  [/onedrive|1drv\.ms|sharepoint/, "OneDrive", "#38bdf8"],
  [/terabox|1024tera/, "TeraBox", "#22d3ee"],
  [/fshare\.vn/, "Fshare", "#fb923c"],
  [/github\.com/, "GitHub", "#e2e8f0"],
  [/t\.me|telegram/, "Telegram", "#38bdf8"],
];

export function providerOf(url: string) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* link sai định dạng */ }
  const hit = PROVIDERS.find(([re]) => re.test(host));
  return { name: hit ? hit[1] : host || "Liên kết", color: hit ? hit[2] : "#a59dc9", host };
}
