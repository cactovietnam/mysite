import { useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";

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

let uid: string | null = null; // người đang đăng nhập (do FavSync đặt); null = chỉ lưu ở trình duyệt
export const setFavUser = (id: string | null) => { uid = id; };

const ROW = { onConflict: "user_id,slug", ignoreDuplicates: true } as const;

export const toggleFav = (slug: string) => {
  const cur = read("fav");
  const adding = !cur.includes(slug);
  write("fav", adding ? [slug, ...cur] : cur.filter((s) => s !== slug));
  const sb = uid ? getSupabase() : null;
  if (!sb) return;
  // shortcut: lỗi mạng bị bỏ qua, lần đăng nhập sau sẽ gộp lại từ danh sách trên máy
  const q = adding ? sb.from("favorites").upsert({ slug }, ROW) : sb.from("favorites").delete().eq("slug", slug);
  void q.then(() => {}, () => {});
};

// Đăng nhập xong: gộp yêu thích trên máy với trên máy chủ (hợp của hai bên), đẩy phần còn thiếu lên.
// shortcut: bỏ yêu thích ở máy A không xóa được mục còn nằm ở máy B, nó sẽ quay lại khi B đăng nhập.
export async function syncFavs() {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from("favorites").select("slug").order("created_at", { ascending: false });
  if (error || !data) return;
  const remote = data.map((r) => String(r.slug));
  const local = read("fav");
  const merged = [...new Set([...local, ...remote])];
  if (merged.length !== local.length) write("fav", merged);
  const missing = local.filter((s) => !remote.includes(s));
  if (missing.length) await sb.from("favorites").upsert(missing.map((slug) => ({ slug })), ROW);
}

export const markSeen = (slug: string) => {
  const cur = read("seen");
  if (cur[0] !== slug) write("seen", [slug, ...cur.filter((s) => s !== slug)]);
};
