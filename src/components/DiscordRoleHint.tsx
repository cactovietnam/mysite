import Link from "next/link";
import { LOGO } from "@/lib/logos";

// Nhắc đồng bộ Discord ngay sau khi thanh toán key: bấm vào là sang trang liên kết (nơi cấp role khách hàng).
export default function DiscordRoleHint() {
  return (
    <Link href="/tai-khoan/discord"
          className="flex items-center gap-3 rounded-2xl border border-[#5865F2]/40 bg-[#5865F2]/10 px-4 py-3 text-left text-sm transition hover:bg-[#5865F2]/20">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#5865F2] text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d={LOGO.discord.d} /></svg>
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">Đồng bộ Discord để nhận role khách hàng</b>
        <span className="text-xs text-haze">Bấm để liên kết tài khoản, role được cấp tự động sau khi mua key.</span>
      </span>
      <span aria-hidden className="text-lg text-[#8c96ff]">&rarr;</span>
    </Link>
  );
}
