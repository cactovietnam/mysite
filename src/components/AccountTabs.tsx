"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useList } from "@/lib/user-lists";

const tab = "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95";
const num = "rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums text-haze";

// Thanh tab của khu Tài khoản. Yêu thích / Đã xem là bộ lọc trong kho game nên dẫn về trang chủ, giống menu tên người dùng.
export default function AccountTabs() {
  const pathname = usePathname();
  const fav = useList("fav").length;
  const seen = useList("seen").length;
  const cls = (on: boolean) => `${tab} ${on ? "bg-berry text-ink" : "bg-white/10 text-mist hover:bg-white/20"}`;
  const page = (href: string, label: string) => (
    <Link href={href} aria-current={pathname === href ? "page" : undefined} className={cls(pathname === href)}>{label}</Link>
  );
  return (
    <nav aria-label="Tài khoản" className="mx-auto w-full max-w-5xl px-4 pt-8 sm:pt-12">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {page("/tai-khoan/key", "Key đã mua")}
        <Link href="/?list=fav#kho-game" className={cls(false)}>Yêu thích <span className={num}>{fav}</span></Link>
        <Link href="/?list=seen#kho-game" className={cls(false)}>Đã xem <span className={num}>{seen}</span></Link>
        {page("/tai-khoan/discord", "Discord")}
      </div>
    </nav>
  );
}
