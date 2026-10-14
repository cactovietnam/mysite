import { site } from "@/data/site";

// Thanh thông báo dưới slider. Sửa chữ ở quan_ly.py (mục 7); để trống thì ẩn cả thanh.
const home = site.home as { announcement?: string; announcementLabel?: string; libraryTitle: string };

export default function Announcement() {
  const text = (home.announcement ?? "").trim();
  if (!text) return null;

  return (
    <section aria-label="Thông báo" className="mx-auto mt-4 max-w-6xl px-4">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-berry/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-berry">
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8v4h3l6 4V4L6 8H3Zm12-1a4 4 0 0 1 0 6" />
          </svg>
          <span className="max-sm:sr-only">{home.announcementLabel || "Thông báo"}</span>
        </span>
        <span aria-hidden className="h-5 w-px shrink-0 bg-white/15" />
        <p className="line-clamp-2 min-w-0 flex-1 text-mist/85 sm:line-clamp-1">{text}</p>
        <a href="#kho-game" className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-medium text-berry transition hover:bg-white/10 sm:inline-flex">
          {home.libraryTitle}
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 10h12m0 0-4-4m4 4-4 4" />
          </svg>
        </a>
      </div>
    </section>
  );
}
