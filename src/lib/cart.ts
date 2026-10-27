import { useSyncExternalStore } from "react";

// Giỏ hàng + các đơn đã tạo (để xem lại key) lưu ở localStorage, đồng bộ giữa tab bằng sự kiện "storage".
// Giá không lưu ở đây: luôn lấy từ /api/keys và server tính lại khi tạo đơn.
export type PastOrder = { code: string; token: string; at: number };
const CART_KEY = "gsvh-cart", ORDERS_KEY = "gsvh-orders", EVENT = "cart-change";
const MAX_ORDERS = 20;
const EMPTY_CART: string[] = [];
const EMPTY_ORDERS: PastOrder[] = [];

const cache = new Map<string, { raw: string | null; val: unknown }>();
function read<T>(key: string, empty: T, ok: (v: unknown) => T | null): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return empty; }
  const c = cache.get(key);
  if (c && c.raw === raw) return c.val as T;
  let val = empty;
  try { val = (raw ? ok(JSON.parse(raw)) : null) ?? empty; } catch { /* dữ liệu hỏng: coi như rỗng */ }
  cache.set(key, { raw, val });
  return val;
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* riêng tư / đầy bộ nhớ: bỏ qua */ }
  window.dispatchEvent(new Event(EVENT));
}

const readCart = () => read<string[]>(CART_KEY, EMPTY_CART, (v) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null);
const readOrders = () => read<PastOrder[]>(ORDERS_KEY, EMPTY_ORDERS, (v) => Array.isArray(v)
  ? v.filter((o): o is PastOrder => !!o && typeof o.code === "string" && typeof o.token === "string" && typeof o.at === "number") : null);

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
};

export const useCart = () => useSyncExternalStore(subscribe, readCart, () => EMPTY_CART);
export const usePastOrders = () => useSyncExternalStore(subscribe, readOrders, () => EMPTY_ORDERS);

export const addToCart = (slug: string) => { const c = readCart(); if (!c.includes(slug)) write(CART_KEY, [...c, slug]); };
export const removeFromCart = (slug: string) => write(CART_KEY, readCart().filter((s) => s !== slug));
export const clearCart = () => write(CART_KEY, []);
export const rememberOrder = (o: { code: string; token: string }) =>
  write(ORDERS_KEY, [{ ...o, at: Date.now() }, ...readOrders().filter((x) => x.code !== o.code)].slice(0, MAX_ORDERS));

// Cho phép mở giỏ từ nơi khác (nút "Mua key" ở trang game).
export const openCart = () => window.dispatchEvent(new Event("cart-open"));
