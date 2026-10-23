import "./globals.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import AccountMenu from "@/components/AccountMenu";
import AgeGate from "@/components/AgeGate";
import BackToTop from "@/components/BackToTop";
import Brand from "@/components/Brand";
import Footer from "@/components/Footer";
import HeaderShell from "@/components/HeaderShell";
import NavLinks from "@/components/NavLinks";
import ReloadReset from "@/components/ReloadReset";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import FavSync from "@/components/FavSync";
import { games } from "@/data/games";
import { site, siteUrl } from "@/data/site";
import { donateConfig, donateNavLabel } from "@/data/donate";

const display = Bricolage_Grotesque({ subsets: ["latin", "vietnamese"], variable: "--font-bricolage" });
const sans = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-bevn" });

export const metadata: Metadata = {
  metadataBase: siteUrl, // để ảnh Open Graph dạng /covers/... thành link tuyệt đối
  title: { default: `${site.name} - ${site.home.libraryTitle}`, template: `%s | ${site.name}` },
  description: site.description,
  other: site.ageGate.enabled ? { rating: "adult" } : undefined,
};

// Dòng giới thiệu ngắn cạnh logo to (site.json -> tagline, sửa ở quan_ly.py mục 7; trống = ẩn).
const tagline = (site as unknown as { tagline?: string }).tagline?.trim() || undefined;

const engines = Array.from(new Set(games.map((g) => g.engine))); // tab engine trên menu: tự theo dữ liệu game

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <ClientErrorReporter />
        <ReloadReset />
        <FavSync />
        {site.ageGate.enabled && <AgeGate />}
        <HeaderShell
          brand={<Brand />}
          nav={<NavLinks engines={engines} />}
          tagline={tagline}
          tools={
            <>
              {/^https?:\/\//i.test(site.discord) && (
                <a href={site.discord} target="_blank" rel="noopener noreferrer"
                   className="hidden rounded-full px-4 py-2 text-sm text-mist/80 transition hover:bg-white/10 hover:text-mist lg:block">{site.nav.discord}</a>
              )}
              {donateConfig.enabled && (
                <Link href="/donate" aria-label={donateNavLabel} title={donateNavLabel}
                      className="grid size-10 place-items-center rounded-full text-berry transition hover:bg-white/10 md:hidden">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
                  </svg>
                </Link>
              )}
              <SearchBox />
              <AccountMenu />
            </>
          }
        />

        <div className="flex-1">{children}</div>

        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}
