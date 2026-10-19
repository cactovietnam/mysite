import "./globals.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Be_Vietnam_Pro } from "next/font/google";
import SearchBox from "@/components/SearchBox";
import AccountMenu from "@/components/AccountMenu";
import AgeGate from "@/components/AgeGate";
import BackToTop from "@/components/BackToTop";
import Brand from "@/components/Brand";
import Footer from "@/components/Footer";
import NavLinks from "@/components/NavLinks";
import ReloadReset from "@/components/ReloadReset";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import FavSync from "@/components/FavSync";
import { games } from "@/data/games";
import { site, siteUrl } from "@/data/site";

const display = Bricolage_Grotesque({ subsets: ["latin", "vietnamese"], variable: "--font-bricolage" });
const sans = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-bevn" });

export const metadata: Metadata = {
  metadataBase: siteUrl, // để ảnh Open Graph dạng /covers/... thành link tuyệt đối
  title: { default: `${site.name} - ${site.home.libraryTitle}`, template: `%s | ${site.name}` },
  description: site.description,
  other: site.ageGate.enabled ? { rating: "adult" } : undefined,
};

const engines = Array.from(new Set(games.map((g) => g.engine))); // tab engine trên menu: tự theo dữ liệu game

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <ClientErrorReporter />
        <ReloadReset />
        <FavSync />
        {site.ageGate.enabled && <AgeGate />}
        <header id="site-header" className="sticky top-4 z-40 px-4">
          <div className="glass edge mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full pl-3 pr-2 shadow-lg shadow-black/20">
            <Brand />
            {/* tab ở giữa (từ md trở lên); điện thoại chỉ còn logo + tìm kiếm, lọc engine đã có sẵn trong Kho game */}
            <NavLinks engines={engines} />
            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
              {/^https?:\/\//i.test(site.discord) && (
                <a href={site.discord} target="_blank" rel="noopener noreferrer"
                   className="hidden rounded-full px-4 py-2 text-sm text-mist/80 transition hover:bg-white/10 hover:text-mist lg:block">{site.nav.discord}</a>
              )}
              <SearchBox />
              <AccountMenu />
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}

