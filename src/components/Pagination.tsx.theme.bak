"use client";

// Thanh trang nằm ngay dưới hàng game cuối cùng nên tự trôi xuống khi lưới thêm hàng.
// Luôn hiện (kể cả chỉ 1 trang). Nhiều trang thì các nút tự xuống hàng (flex-wrap), không bị tràn khung.
const num =
  "grid size-10 place-items-center rounded-xl border text-sm font-semibold tabular-nums transition duration-300";
const arrow =
  "grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-mist transition duration-300 hover:-translate-y-0.5 hover:border-[#a78bfa]/50 hover:bg-[#a78bfa]/15 active:scale-95 disabled:pointer-events-none disabled:opacity-30";

export default function Pagination({ page, pages, total, size, onPage }: {
  page: number; pages: number; total: number; size: number; onPage: (p: number) => void;
}) {
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex max-w-full flex-wrap items-center justify-center gap-2">
        <li>
          <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)} className={arrow}>
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 5-5 5 5 5" /></svg>
          </button>
        </li>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
          const on = p === page;
          return (
            <li key={p}>
              <button type="button" onClick={() => onPage(p)} aria-label={`Trang ${p}`} aria-current={on ? "page" : undefined}
                      className={`${num} ${on
                        ? "border-transparent bg-gradient-to-br from-[#7c3aed] to-[#db2777] text-white shadow-[0_8px_24px_-8px_#db2777]"
                        : "border-white/10 bg-white/[0.04] text-mist/80 hover:-translate-y-0.5 hover:border-[#a78bfa]/50 hover:bg-[#a78bfa]/15 hover:text-mist active:scale-95"}`}>
                {p}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)} className={arrow}>
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 5 5 5-5 5" /></svg>
          </button>
        </li>
      </ul>
      <p aria-live="polite" className="text-xs tabular-nums text-haze">Trang {page}/{pages} · game {from}–{to} / {total}</p>
    </nav>
  );
}
