import { site } from "@/data/site";

// Thanh thông báo dưới banner. Nội dung sửa ở site.json -> announcement (trống = ẩn).
export default function NoticeBar() {
  if (!site.announcement.trim()) return null;
  return (
    <div className="mx-auto mt-5 max-w-6xl px-4">
      <div className="glass flex items-center gap-3 rounded-full py-2 pl-2 pr-5 text-sm">
        <span className="shrink-0 rounded-full bg-berry/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-berry">Thông báo</span>
        <p className="min-w-0 flex-1 truncate text-mist/80">{site.announcement}</p>
        <a href="#kho-game" className="hidden shrink-0 items-center gap-1.5 font-medium text-berry transition hover:text-mist sm:inline-flex">
          {site.home.featuredBadge}
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 10h12m0 0-5-5m5 5-5 5" />
          </svg>
        </a>
      </div>
    </div>
  );
}
