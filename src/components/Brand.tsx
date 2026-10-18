import HomeLink from "./HomeLink";
import { site } from "@/data/site";

// Logo chữ: ô gradient chứa tay cầm game + tên web chữ hoa, giãn chữ, chuyển màu kem sang hồng.
export default function Brand() {
  return (
    <HomeLink aria-label={site.name} className="group flex shrink-0 items-center gap-2.5">
      <span aria-hidden
            className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-berry to-[#7c5cff] text-ink shadow-[0_6px_20px_-6px_var(--color-berry)] transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
        <svg viewBox="0 0 48 32" className="h-5 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6h24c5 0 8 4 9 11l1 8c.4 3-1.6 5-4 5-2 0-3.2-1-4.3-2.6L35 24H13l-3.7 3.4C8.2 29 7 30 5 30c-2.4 0-4.4-2-4-5l1-8C3 10 7 6 12 6Z" />
          <path d="M13 12v6M10 15h6" />
          <circle cx="31" cy="13" r="1.4" /><circle cx="36" cy="17" r="1.4" />
        </svg>
      </span>
      <span className="bg-gradient-to-r from-mist via-mist to-berry bg-clip-text font-display text-xl font-extrabold uppercase tracking-[0.1em] text-transparent">
        {site.name}
      </span>
    </HomeLink>
  );
}
