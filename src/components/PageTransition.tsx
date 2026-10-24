"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const LEAVE_MS = 150; // khớp transition của #page trong globals.css

// Hiệu ứng rời trang: bấm link nội bộ sang trang khác thì nội dung mờ đi (LEAVE_MS) rồi mới chuyển; trang mới tự hiện dần (app/template.tsx).
// Không đụng: link cùng trang (bộ lọc, #kho-game), mở tab mới, Ctrl/Cmd/Shift+click, link tải file, /api, người dùng bật "giảm chuyển động".
export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const failsafe = useRef(0);

  // Đã sang trang mới: bỏ trạng thái "đang rời" (tắt transition một nhịp để trang mới không bị mờ ngược lại)
  useEffect(() => {
    const el = document.getElementById("page");
    window.clearTimeout(failsafe.current);
    if (!el || !el.hasAttribute("data-leaving")) return;
    el.style.transition = "none";
    el.removeAttribute("data-leaving");
    const r = requestAnimationFrame(() => { el.style.transition = ""; });
    return () => cancelAnimationFrame(r);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let u: URL;
      try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin !== location.origin || u.pathname === location.pathname || u.pathname.startsWith("/api/")) return;

      root.setAttribute("data-nav", ""); // từ giờ trang mới được phép chạy hiệu ứng vào
      const el = document.getElementById("page");
      if (reduce.matches || !el) return; // để Link điều hướng như thường
      e.preventDefault(); // Link của Next thấy defaultPrevented nên không tự điều hướng nữa; ta tự push sau khi mờ xong
      el.setAttribute("data-leaving", "");
      window.clearTimeout(timer);
      window.clearTimeout(failsafe.current);
      timer = window.setTimeout(() => router.push(u.pathname + u.search + u.hash), LEAVE_MS);
      failsafe.current = window.setTimeout(() => el.removeAttribute("data-leaving"), 3000); // điều hướng hỏng thì trả lại nội dung
    };
    const onPop = () => root.setAttribute("data-nav", ""); // nút Back/Forward cũng có hiệu ứng vào
    const arm = window.setTimeout(() => root.setAttribute("data-nav", ""), 800); // chuyển trang bằng code (đăng nhập xong...) cũng có hiệu ứng vào

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(timer);
      window.clearTimeout(arm);
    };
  }, [router]);

  return null;
}
