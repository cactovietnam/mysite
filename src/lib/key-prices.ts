// Giá key công khai (/api/keys) tải một lần, dùng chung cho nút "Mua key" và trang giỏ hàng. Lỗi thì lần sau tải lại.
export type Price = { slug: string; price: number; fee: number };
let pending: Promise<Price[]> | null = null;
export function loadKeyRows(): Promise<Price[]> {
  pending ??= fetch("/api/keys", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ items: Price[] }>; })
    .then((d) => d.items)
    .catch((e) => { pending = null; throw e; });
  return pending;
}
export const loadKeyPrices = () => loadKeyRows().then((rows) => new Map(rows.map((i) => [i.slug, i.price + i.fee] as const)));
