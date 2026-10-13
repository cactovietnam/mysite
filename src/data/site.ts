import data from "./site.json";

// Chữ, link và màu engine trên web. Sửa bằng quan_ly.py (mục 7) hoặc sửa tay site.json.
export const site = data;

// new URL() ném lỗi nếu url sai: trả undefined để build không chết.
export const siteUrl = (() => {
  try { return new URL(data.url); } catch { return undefined; }
})();
