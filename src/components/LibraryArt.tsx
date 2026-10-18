// Hình minh họa cho Kho game khi ít game hoặc không có kết quả. Thuần SVG/CSS, không tốn request.
const PAD =
  "M12 6h24c5 0 8 4 9 11l1 8c.4 3-1.6 5-4 5-2 0-3.2-1-4.3-2.6L35 24H13l-3.7 3.4C8.2 29 7 30 5 30c-2.4 0-4.4-2-4-5l1-8C3 10 7 6 12 6Z";

// Ô giữ chỗ cạnh game thật khi kho mới có 1-2 game: lưới không trông trống trải
export function GhostCard() {
  return (
    <div aria-hidden className="rounded-2xl p-2">
      <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.025]">
        <div className="text-center text-haze">
          <svg viewBox="0 0 48 32" className="mx-auto h-9 w-14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={PAD} /><path d="M13 12v6M10 15h6" /><circle cx="31" cy="13" r="1.2" /><circle cx="36" cy="17" r="1.2" />
          </svg>
          <p className="mt-2 text-sm">Game mới sẽ xuất hiện ở đây</p>
        </div>
      </div>
      <div className="mt-2.5 px-1"><div className="h-3.5 w-24 rounded bg-white/[0.06]" /></div>
    </div>
  );
}

export function EmptyArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-36 text-haze" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g opacity=".55" transform="translate(8 10) scale(1.5)">
        <path d={PAD} /><path d="M13 12v6M10 15h6" /><circle cx="31" cy="13" r="1.2" /><circle cx="36" cy="17" r="1.2" />
      </g>
      <circle cx="88" cy="54" r="17" stroke="var(--accent)" fill="rgba(15,12,26,0.7)" />
      <path d="m100 66 12 12" stroke="var(--accent)" />
      <path d="M82 54h12" stroke="var(--accent)" />
    </svg>
  );
}
