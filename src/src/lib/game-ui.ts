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
