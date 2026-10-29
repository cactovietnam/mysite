import Link from "next/link";
import { site } from "@/data/site";
import { donateConfig, donateNavLabel } from "@/data/donate";
import Brand from "./Brand";
import HomeLink from "./HomeLink";

const link = "rounded-md py-1 text-haze transition hover:text-mist";

// Chân trang 3 cột: giới thiệu, lối tắt, Discord. Dòng cuối là site.footer (sửa ở quan_ly.py mục 7).
export default function Footer() {
  const hasDiscord = /^https?:\/\//i.test(site.discord);

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 text-sm">
      <div className="border-t border-[#8b5cf6]/25 pt-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-[44ch] leading-relaxed text-haze">{site.description}</p>
          </div>

          <nav aria-label="Lối tắt">
            <h2 className="font-display text-base font-bold tracking-tight">Lối tắt</h2>
            <ul className="mt-3 flex flex-col">
              <li><HomeLink className={link}>{site.nav.explore}</HomeLink></li>
              <li><Link href="/#kho-game" className={link}>{site.home.libraryTitle}</Link></li>
              <li><Link href="/#huong-dan" className={link}>Cách tải và chơi</Link></li>
              {donateConfig.enabled && <li><Link href="/donate" className={link}>Ủng hộ ({donateNavLabel})</Link></li>}
            </ul>
          </nav>

          <div>
            <h2 className="font-display text-base font-bold tracking-tight">Cộng đồng</h2>
            <ul className="mt-3 flex flex-col">
              {hasDiscord && (
                <li>
                  <a href={site.discord} target="_blank" rel="noopener noreferrer" className={link}>{site.nav.discord}</a>
                </li>
              )}
              <li className="py-1 text-haze">Báo link lỗi, góp ý game mới</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-haze">
          <span>{site.footer}</span>
          {site.ageGate.enabled && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold">18+ · Nội dung dành cho người trưởng thành</span>
          )}
        </div>
      </div>
    </footer>
  );
}
