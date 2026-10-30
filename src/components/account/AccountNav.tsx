"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  { label: "Sở hữu", items: [["/tai-khoan", "Bộ sưu tập"], ["/tai-khoan/yeu-thich", "Yêu thích & Đã xem"]] },
  { label: "Giao dịch", items: [["/tai-khoan/key", "Key đã mua"], ["/gio-hang", "Giỏ hàng"]] },
  { label: "Cộng đồng", items: [["/tai-khoan/discord", "Discord"]] },
] as const;

// Điều hướng khu Tài khoản: cột dọc có nhóm từ màn lg, thanh tab cuộn ngang ở màn nhỏ.
export default function AccountNav() {
  const pathname = usePathname();
  let n = 0;
  return (
    <nav aria-label="Tài khoản" className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-4 hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-haze lg:block">Khu tài khoản</p>
      <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:gap-0 lg:overflow-visible">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex shrink-0 gap-1 lg:mb-5 lg:flex-col lg:gap-0">
            <p className="hidden pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-haze/70 lg:block">{g.label}</p>
            {g.items.map(([href, label]) => {
              const on = pathname === href;
              n++;
              return (
                <Link key={href} href={href} aria-current={on ? "page" : undefined}
                      className={`relative flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-[#5eead4] after:to-[#ee5a96] after:transition-transform after:duration-300 lg:px-0 lg:after:inset-x-0 ${
                        on ? "text-mist after:scale-x-100" : "text-slate-400 after:scale-x-0 hover:text-mist hover:after:scale-x-100"}`}>
                  <span className={`font-mono text-[11px] tabular-nums ${on ? "text-[#5eead4]" : "text-haze/60"}`}>{String(n).padStart(2, "0")}</span>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
