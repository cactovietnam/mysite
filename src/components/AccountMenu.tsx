"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authConfigured, getSupabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";

// Nút tài khoản trên header: chưa đăng nhập -> "Đăng nhập"; đã đăng nhập -> chữ cái đầu + menu Đăng xuất.
// Chưa cấu hình Supabase thì không hiện gì (web chạy như cũ).
export default function AccountMenu() {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
  if (user === undefined) return <span aria-hidden className="h-10 w-10 sm:w-[7.5rem]" />;

  if (!user) {
    return (
      <Link href="/dang-nhap" aria-label="Đăng nhập"
            className="flex h-10 items-center gap-2 rounded-full bg-berry px-3 text-sm font-semibold text-ink transition hover:brightness-110 active:scale-95 sm:px-4">
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c.8-3 3.3-4.6 6.5-4.6s5.7 1.6 6.5 4.6" />
        </svg>
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    );
  }

  // user_metadata do chính người dùng sửa được: chỉ dùng để hiển thị, tuyệt đối không dùng để phân quyền.
  const meta = user.user_metadata as { username?: unknown } | undefined;
  const name = typeof meta?.username === "string" && meta.username ? meta.username : (user.email ?? "Tài khoản");

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={`Tài khoản ${name}`}
              className="flex h-10 items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 text-sm transition hover:bg-white/[0.16] sm:pr-4">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-berry to-[#7c5cff] text-xs font-bold uppercase text-ink">
          {name.slice(0, 1)}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{name}</span>
      </button>
      {open && (
        <div role="menu" className="anim-pop absolute right-0 top-12 z-50 w-60 rounded-2xl border border-white/10 bg-plum p-2 shadow-2xl shadow-black/50">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            {user.email && <p className="truncate text-xs text-haze">{user.email}</p>}
          </div>
          <button type="button" role="menuitem"
                  onClick={() => { setOpen(false); void getSupabase()?.auth.signOut(); }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-mist/90 transition hover:bg-white/10">
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
