"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authConfigured, getSupabase } from "@/lib/supabase";
import { displayName, useAuthUser } from "@/lib/auth-store";
import { donateConfig, donateNavLabel } from "@/data/donate";
import { useList } from "@/lib/user-lists";
import { softNav } from "@/lib/soft-nav";

const num = "rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums text-haze";
const item = "block w-full rounded-xl px-3 py-2 text-left text-sm text-mist/90 transition hover:bg-white/10";
const itemRow = item.replace("block", "flex items-center justify-between");

// Cạnh nút Tìm kiếm trên header. Chưa đăng nhập: nút 3 gạch, bấm ra Đăng nhập / Đăng ký.
// Đã đăng nhập: chữ cái đầu + tên, bấm ra menu Đăng xuất. Chưa cấu hình Supabase thì không hiện gì (web chạy như cũ).
export default function AccountMenu() {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const fav = useList("fav").length;
  const seen = useList("seen").length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!authConfigured) return null;
  // Chưa biết trạng thái: giữ chỗ để header không giật khi hydrate xong
  if (user === undefined) return <span aria-hidden className="h-9 w-9 sm:h-10 sm:w-[7.5rem]" />;

  const name = user ? displayName(user) : "";

  return (
    <div ref={ref} className="relative">
      {user ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={`Tài khoản ${name}`}
                className="flex h-9 items-center gap-2 rounded-full bg-white/10 pl-1 pr-1 text-sm transition hover:bg-white/[0.16] sm:h-10 sm:pl-1.5 sm:pr-4">
          <span aria-hidden className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-berry to-[#7c5cff] text-xs font-bold uppercase text-ink">
            {name.slice(0, 1)}
          </span>
          <span className="hidden max-w-[8rem] truncate sm:inline">{name}</span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Menu tài khoản"
                className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#2af5d6,#ff2e93)] p-[2px] transition active:scale-95 sm:size-10">
          <span className="grid size-full place-items-center rounded-full bg-[#14102b]"><svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="m5 5 10 10M15 5 5 15" /> : <><circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5" /></>}
          </svg></span>
        </button>
      )}

      {open && (
        <div role="menu" className="anim-pop absolute right-0 top-12 z-50 w-60 rounded-2xl border border-white/10 bg-plum p-2 shadow-2xl shadow-black/50">
          {user ? (
            <>
              <p className="truncate px-3 py-2 text-sm font-semibold">{name}</p>
              <div className="my-1 border-t border-white/10" />
              {([["fav", "Yêu thích", fav], ["seen", "Đã xem", seen]] as const).map(([k, label, n]) => (
                <Link key={k} href={`/?list=${k}#kho-game`} role="menuitem"
                      onClick={(e) => { setOpen(false); softNav(e, pathname, `?list=${k}`, "library"); }}
                      className={itemRow}>
                  {label}<span className={num}>{n}</span>
                </Link>
              ))}
              <Link href="/tai-khoan/key" role="menuitem" onClick={() => setOpen(false)} className={item}>Key đã mua</Link>
              <Link href="/gio-hang" role="menuitem" onClick={() => setOpen(false)} className={item}>Giỏ hàng</Link>
              {donateConfig.enabled && <Link href="/donate" role="menuitem" onClick={() => setOpen(false)} className={`${item} text-berry min-[400px]:hidden`}>{donateNavLabel}</Link>}
              <div className="my-1 border-t border-white/10" />
              <button type="button" role="menuitem" className={item}
                      onClick={() => { setOpen(false); void getSupabase()?.auth.signOut(); }}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/dang-nhap" role="menuitem" onClick={() => setOpen(false)} className={item}>Đăng nhập</Link>
              <Link href="/dang-ky" role="menuitem" onClick={() => setOpen(false)} className={item}>Đăng ký</Link>
              <div className="my-1 border-t border-white/10" />
              {([["fav", "Yêu thích", fav], ["seen", "Đã xem", seen]] as const).map(([k, label, n]) => (
                <Link key={k} href={`/?list=${k}#kho-game`} role="menuitem"
                      onClick={(e) => { setOpen(false); softNav(e, pathname, `?list=${k}`, "library"); }}
                      className={itemRow}>
                  {label}<span className={num}>{n}</span>
                </Link>
              ))}
              <Link href="/tai-khoan/key" role="menuitem" onClick={() => setOpen(false)} className={item}>Key đã mua</Link>
              <Link href="/gio-hang" role="menuitem" onClick={() => setOpen(false)} className={item}>Giỏ hàng</Link>
              {donateConfig.enabled && <Link href="/donate" role="menuitem" onClick={() => setOpen(false)} className={`${item} text-berry min-[400px]:hidden`}>{donateNavLabel}</Link>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
