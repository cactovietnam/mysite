import HomeLink from "./HomeLink";
import { site } from "@/data/site";

// Logo: ô gradient chứa tay cầm game (gamepad kiểu hiện đại: thân bo tròn, D-pad chữ thập, 4 nút ABXY, 2 cần analog).
export default function Brand() {
  return (
    <HomeLink aria-label={site.name} className="group flex shrink-0 items-center gap-2.5">
      <span
        aria-hidden
        className="relative grid size-10 place-items-center rounded-[14px] bg-gradient-to-br from-berry via-[#c45cff] to-[#7c5cff] shadow-[0_8px_22px_-8px_var(--color-berry),inset_0_1px_0_rgba(255,255,255,0.45)] transition duration-300 group-hover:-rotate-6 group-hover:scale-105"
      >
        {/* vệt sáng phía trên cho có khối */}
        <span className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-t-[12px] bg-gradient-to-b from-white/30 to-transparent" />
        <svg viewBox="0 0 64 44" className="relative h-6 w-[34px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" fill="none" aria-hidden>
          {/* thân tay cầm: tay cầm trái/phải dài xuống, bo mượt */}
          <path
            d="M18 5h28c6 0 10 4 12 12l4 17c1 5-2 9-7 9-3 0-5-1.6-7-4.2L43 31H21l-5 7.8C14 41.4 12 43 9 43c-5 0-8-4-7-9l4-17C8 9 12 5 18 5Z"
            fill="#0f0c1a" fillOpacity="0.9"
          />
          {/* D-pad */}
          <path d="M19 14h4v4.5h4.5v4H23V27h-4v-4.5h-4.5v-4H19Z" fill="#f4eeff" />
          {/* 4 nút ABXY */}
          <circle cx="45" cy="13.5" r="2.3" fill="#ff6b98" />
          <circle cx="45" cy="25" r="2.3" fill="#7c5cff" />
          <circle cx="39.3" cy="19.3" r="2.3" fill="#2dd4bf" />
          <circle cx="50.7" cy="19.3" r="2.3" fill="#ffd166" />
          {/* 2 cần analog nhỏ */}
          <circle cx="28" cy="29" r="2.2" fill="#f4eeff" fillOpacity="0.55" />
          <circle cx="36" cy="29" r="2.2" fill="#f4eeff" fillOpacity="0.55" />
        </svg>
      </span>
      <span className="bg-gradient-to-r from-mist via-mist to-berry bg-clip-text font-display text-xl font-extrabold uppercase tracking-[0.1em] text-transparent">
        {site.name}
      </span>
    </HomeLink>
  );
}
