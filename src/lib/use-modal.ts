import { useEffect, useRef } from "react";

// Hộp thoại: khóa cuộn trang nền, nhốt phím Tab trong hộp, Esc để đóng, trả focus khi đóng.
// Gắn ref vào phần tử role="dialog" (cần tabIndex={-1}). Phần tử có data-autofocus được focus trước.
// Bỏ onClose nếu hộp không cho đóng bằng Esc (vd cổng 18+).
export function useModal(open: boolean, onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(root?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])') ?? []);
    (root?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? root)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeRef.current) { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab" || !root) return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || !root.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !root.contains(a))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  return ref;
}
