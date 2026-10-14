"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { softNav } from "@/lib/soft-nav";

// Link về trang chủ: đang ở trang chủ thì cuộn mượt lên đầu và xóa bộ lọc; trang khác thì điều hướng như Link thường.
export default function HomeLink(props: Omit<React.ComponentProps<typeof Link>, "href" | "onClick">) {
  const pathname = usePathname();
  return <Link {...props} href="/" onClick={(e) => softNav(e, pathname, "", "top")} />;
}
