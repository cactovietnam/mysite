import HomeLink from "./HomeLink";
import { site } from "@/data/site";

// Logo: public/logo-gsvh.svg (khiên + tay cầm). Dùng <img> chứ không inline: gradient trong SVG inline hỏng ở tầng header bị display:none.
// `sub` = dòng nhỏ dưới tên (chỉ bản logo to). Chia ở dấu "·": nửa đầu trắng, nửa sau xanh neon.
export default function Brand({ sub }: { sub?: string }) {
  const [white, cyan] = (sub ?? "").split("·").map((s) => s.trim());
  return (
    <HomeLink aria-label={site.name} className="group flex shrink-0 items-center gap-2 sm:gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-gsvh.svg" alt="" width={45} height={48} className="h-10 w-[38px] shrink-0 sm:h-12 sm:w-[45px] transition duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none max-[339px]:hidden">
        <span className="font-[family-name:var(--font-orbitron)] text-xl font-extrabold sm:text-2xl uppercase tracking-[0.06em]">
          <span className="text-white">{site.name.slice(0, 2)}</span>
          <span className="bg-[linear-gradient(90deg,#ff47b6_0%,#3b82f6_45%,#5eead4_100%)] bg-clip-text text-transparent">{site.name.slice(2)}</span>
        </span>
        {white && (
          <span className="mt-1.5 whitespace-nowrap font-[family-name:var(--font-barlow)] text-xs font-semibold uppercase tracking-[0.12em]">
            <span className="text-white">{white}</span>
            {cyan && <span className="ml-1.5 text-[#5eead4]">{cyan}</span>}
          </span>
        )}
      </span>
    </HomeLink>
  );
}
