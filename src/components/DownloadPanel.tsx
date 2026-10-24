"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useModal } from "@/lib/use-modal";
import { usePresence } from "@/lib/use-presence";
import { authConfigured, getSupabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";
import { setReturnTo } from "@/lib/after-auth";
import type { Game } from "@/data/games";
import { providerOf } from "@/lib/game-ui";

type Links = Game["links"];

// Nút "Tải xuống": phải có tài khoản. Chưa đăng nhập -> bảng mời tạo tài khoản; đã đăng nhập -> hỏi máy chủ lấy link (Gofile, Drive, MEGA...).
export default function DownloadPanel({ slug, title, hasLinks }: { slug: string; title: string; hasLinks: boolean }) {
  const user = useAuthUser(); // undefined = đang xác định | null = chưa đăng nhập
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [links, setLinks] = useState<Links | null>(null);
  const [err, setErr] = useState<"auth" | "error" | null>(null);

  const { mounted, closing } = usePresence(open); // giữ hộp thêm ~160ms để chạy hiệu ứng đóng
  const modalRef = useModal(open, () => setOpen(false)); // khóa cuộn, nhốt Tab, Esc đóng, trả focus

  // Popup mở: header nổi lên trên lớp phủ (CSS ở globals.css, theo thuộc tính data-dl-open).
  // Bấm vào header thì đóng popup, tránh hai hộp thoại (vd Tìm kiếm) cùng mở và tranh focus/Esc.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute("data-dl-open", "");
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("#site-header")) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      root.removeAttribute("data-dl-open"); // cũng chạy khi chuyển trang lúc popup đang mở
    };
  }, [open]);

  // Đã đăng nhập và mở bảng: lấy link từ máy chủ (một lần, có rồi thì dùng lại).
  useEffect(() => {
    if (!open || !user || links || err) return;
    let dead = false;
    (async () => {
      let next: { links?: Links; err?: "auth" | "error" };
      try {
        const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
        if (!token) next = { err: "auth" };
        else {
          const res = await fetch(`/api/download?slug=${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
          if (res.status === 401) next = { err: "auth" };
          else if (!res.ok) next = { err: "error" };
          else next = { links: ((await res.json()) as { links?: Links }).links ?? [] };
        }
      } catch {
        next = { err: "error" };
      }
      if (dead) return;
      if (next.links) setLinks(next.links); else setErr(next.err ?? "error");
    })();
    return () => { dead = true; };
  }, [open, user, links, err, slug]);

  if (!hasLinks) {
    return <p className="rounded-full bg-white/10 px-6 py-3 text-haze">Chưa có link tải cho game này.</p>;
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("Sao chép link (Ctrl+C):", url); // trình duyệt chặn clipboard: cho người dùng chép tay
    }
  };

  const needLogin = authConfigured && (user === null || err === "auth");
  const goAuth = () => { setReturnTo(`/game/${slug}`); setOpen(false); }; // đăng nhập/đăng ký xong quay lại đúng game này
  const close = (
    <button onClick={() => setOpen(false)} aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">&times;</button>
  );

  return (
    <>
      <button onClick={() => { setErr(null); setOpen(true); }} disabled={authConfigured && user === undefined}
              className="group inline-flex items-center gap-3 rounded-full bg-accent py-2.5 pl-7 pr-2.5 font-semibold text-on-accent shadow-[0_14px_36px_-12px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_var(--accent)] active:scale-95 disabled:cursor-wait disabled:opacity-70">
        Tải xuống
        <span className="grid size-9 place-items-center rounded-full bg-ink/15 transition duration-300 group-hover:translate-y-0.5 group-hover:bg-ink/25">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3v10m0 0-4-4m4 4 4-4M4 17h12" />
          </svg>
        </span>
      </button>

      {mounted && createPortal(
        <div className={`${closing ? "anim-out-fade" : "anim-fade"} fixed inset-0 z-50 grid place-items-center bg-ink/85 p-4`} onClick={() => setOpen(false)}>
          {needLogin ? (
            <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Cần tài khoản để tải game"
                 className={`glass ${closing ? "anim-out-pop" : "anim-pop"} w-full max-w-md rounded-[2rem] p-6 text-center shadow-2xl shadow-black/50`}
                 onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end">{close}</div>
              <span className="mx-auto -mt-2 grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
                <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="10" width="16" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold leading-tight">Cần có tài khoản để tải game</h2>
              <p className="mt-2 text-sm text-haze">Tạo tài khoản miễn phí chỉ mất vài giây. Xong bạn sẽ được đưa về lại <b className="font-semibold text-mist">{title}</b> để tải.</p>
              <Link href="/dang-ky" onClick={goAuth} data-autofocus
                    className="mt-6 block rounded-full bg-accent px-7 py-3.5 font-semibold text-on-accent shadow-[0_14px_36px_-12px_var(--accent)] transition hover:-translate-y-0.5 active:scale-95">
                Tạo tài khoản
              </Link>
              <p className="mt-4 text-sm text-haze">Đã có tài khoản?{" "}
                <Link href="/dang-nhap" onClick={goAuth} className="font-medium text-mist underline-offset-2 hover:underline">Đăng nhập</Link>
              </p>
            </div>
          ) : (
            <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Link tải ${title}`}
                 className={`glass ${closing ? "anim-out-pop" : "anim-pop"} w-full max-w-md rounded-[2rem] p-5 shadow-2xl shadow-black/50`}
                 onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 px-1">
                <div>
                  <h2 className="font-display text-xl font-bold leading-tight">Tải {title}</h2>
                  <p className="mt-1 text-sm text-haze">Chọn một nơi tải. Link nào lỗi thì thử link khác.</p>
                </div>
                {close}
              </div>

              {!authConfigured ? (
                <p role="alert" className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-haze">Tính năng tài khoản chưa được cấu hình nên chưa thể tải game.</p>
              ) : err === "error" ? (
                <div role="alert" className="mt-4 space-y-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <p>Không lấy được link tải. Thử lại sau ít phút.</p>
                  <button type="button" onClick={() => setErr(null)} className="rounded-full bg-white/10 px-4 py-1.5 text-mist transition hover:bg-white/20">Thử lại</button>
                </div>
              ) : !links ? (
                <p role="status" className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-6 text-center text-sm text-haze">Đang lấy link tải…</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {links.map((l, i) => {
                    const p = providerOf(l.url);
                    const sub = l.label && l.label !== p.name ? l.label : p.host;
                    return (
                      <li key={l.url} className="anim-rise flex items-center gap-1 rounded-2xl bg-white/[0.06] transition duration-300 hover:translate-x-1 hover:bg-white/[0.12]"
                          style={{ "--d": `${80 + i * 60}ms` } as React.CSSProperties}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 p-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl font-display text-lg font-bold"
                                style={{ background: `${p.color}26`, color: p.color }}>{p.name.slice(0, 1)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{p.name}</span>
                            <span className="block truncate text-xs text-haze">{sub}</span>
                          </span>
                        </a>
                        <button onClick={() => copy(l.url)} aria-label={`Sao chép link ${p.name}`}
                                className="mr-3 shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20">
                          {copied === l.url ? "Đã chép" : "Sao chép"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
