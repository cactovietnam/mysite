import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Be_Vietnam_Pro } from "next/font/google";
import SearchBox from "@/components/SearchBox";

const display = Bricolage_Grotesque({ subsets: ["latin", "vietnamese"], variable: "--font-bricolage" });
const sans = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-bevn" });

export const metadata: Metadata = {
  title: { default: "MySite - Kho game", template: "%s | MySite" },
  description: "Danh sách game và hướng dẫn cài đặt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <header className="sticky top-4 z-40 px-4">
          <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-6 pr-2 shadow-lg shadow-black/20">
            <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
              MySite<span className="text-berry">.</span>
            </Link>
            <nav className="flex items-center gap-1.5 text-sm">
              <Link href="/" className="rounded-full px-4 py-2 text-mist/80 transition hover:bg-white/10 hover:text-mist">Khám phá</Link>
              <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer"
                 className="hidden rounded-full px-4 py-2 text-mist/80 transition hover:bg-white/10 hover:text-mist sm:block">Discord</a>
              <SearchBox />
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 text-sm text-haze">
          <div className="border-t border-white/10 pt-6">© 2026 MySite</div>
        </footer>
      </body>
    </html>
  );
}
