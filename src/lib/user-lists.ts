import { useSyncExternalStore } from "react";

// Danh sách yêu thích / đã xem lưu ở localStorage của trình duyệt (không cần tài khoản).
// Mỗi danh sách là mảng slug, mới nhất đứng đầu. Đồng bộ giữa các tab qua sự kiện "storage".
export type ListName = "fav" | "seen";
const KEY: Record<ListName, string> = { fav: "gsvh-fav", seen: "gsvh-seen" };
const MAX = 200; // shortcut: cắt ở 200 mục để localStorage không phình, tăng nếu cần
const EVENT = "user-lists";
const EMPTY: string[] = [];

// Cache theo chuỗi thô: getSnapshot phải trả cùng tham chiếu khi dữ liệu không đổi.
const cache: Record<ListName, { raw: string | null; list: string[] }> = {
  fav: { raw: null, list: EMPTY },
  seen: { raw: null, list: EMPTY },
};

function read(name: ListName): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY[name]); } catch { return EMPTY; }
  const c = cache[name];
  if (raw === c.raw) return c.list;
  let list = EMPTY;
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(v)) list = v.filter((x): x is string => typeof x === "string");
  } catch { /* dữ liệu hỏng: coi như rỗng */ }
  cache[name] = { raw, list };
  return list;
}

function write(name: ListName, list: string[]) {
  try { localStorage.setItem(KEY[name], JSON.stringify(list.slice(0, MAX))); } catch { /* chế độ riêng tư / đầy bộ nhớ: bỏ qua */ }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
};

export const useList = (name: ListName) => useSyncExternalStore(subscribe, () => read(name), () => EMPTY);

export const toggleFav = (slug: string) => {
  const cur = read("fav");
  write("fav", cur.includes(slug) ? cur.filter((s) => s !== slug) : [slug, ...cur]);
};

export const markSeen = (slug: string) => {
  const cur = read("seen");
  if (cur[0] !== slug) write("seen", [slug, ...cur.filter((s) => s !== slug)]);
};
