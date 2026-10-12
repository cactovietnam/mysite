import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";
import SearchBox from "@/components/SearchBox";

const display = Playfair_Display({ subsets: ["latin", "vietnamese"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MySite - Kho game",
  description: "Danh sách game và hướng dẫn cài đặt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body className="font-[family-name:var(--font-sans)] antialiased">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-6 md:px-10">
          <Link href="/" className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
            MYSITE
          </Link>
          <nav className="flex items-center gap-6 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Khám phá</Link>
            <a href="https://discord.gg/" className="hover:text-white">Discord</a>
            <SearchBox />
          </nav>
        </header>
        {children}
        <footer className="border-t border-white/10 px-6 py-8 text-sm text-white/40 md:px-10">
          © {new Date().getFullYear()} MySite
        </footer>
      </body>
    </html>
  );
}
