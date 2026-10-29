"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Quãng cuộn (px) để header thu nhỏ hoàn toàn (giữ nguyên như bản cũ).
const RANGE = 120;
// Chiều cao tầng logo to (px). Khớp với h-[104px] và -96px bên dưới.
const BIG = 104;

type Props = { brand: ReactNode; brandBig?: ReactNode; nav: ReactNode; tools: ReactNode };

/**
 * Header giống hệt bản cũ (logo to giữa + menu, cuộn xuống thu thành pill có logo nhỏ bên trái),
 * khác ở cách làm để KHÔNG giật:
 *  - header `fixed` + khối giữ chỗ tự đo chiều cao => nội dung không bị đẩy khi cuộn
 *  - thu nhỏ bằng transform/opacity, không đổi height
 *  - nền pill là màu ĐẶC (không trong suốt, không blur)
 */
export default function HeaderShell({ brand, brandBig, nav, tools }: Props) {
  const ref = useRef<HTMLElement>(null);
  const spacer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const big = el.querySelector<HTMLElement>("[data-big]");
    const small = el.querySelector<HTMLElement>("[data-small]");
    const wide = window.matchMedia("(min-width: 768px)");
    let raf = 0;
    let last = -1;

    // Khối giữ chỗ = chiều cao thật của header (offsetHeight không bị transform làm sai).
    const sp = spacer.current;
    const ro = new ResizeObserver(() => { if (sp) sp.style.height = el.offsetHeight + "px"; });
    ro.observe(el);

    const update = () => {
      raf = 0;
      const raw = Math.min(1, Math.max(0, window.scrollY / RANGE));
      const p = Math.round(raw * raw * (3 - 2 * raw) * 100) / 100; // easing smoothstep: mượt cả 2 chiều
      if (p === last) return;
      last = p;
      el.style.setProperty("--hp", String(p));
      big?.toggleAttribute("inert", raw >= 0.6);
      small?.toggleAttribute("inert", wide.matches && raw < 0.6);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onWide = () => { last = -1; update(); };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", onWide);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Giữ chỗ (tự đo lại bằng ResizeObserver). Giá trị ban đầu = 8 + 104 + 56 (md) hoặc 8 + 56 (điện thoại). */}
      <div ref={spacer} aria-hidden className="h-16 md:h-[168px]" />

      <header
        ref={ref}
        id="site-header"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-2"
        style={{ "--hp": 0 } as CSSProperties}
      >
        {/* Tay cầm viền neon mờ hai bên, mờ dần khi cuộn */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-[168px] overflow-hidden md:block"
             style={{ opacity: "clamp(0, calc(1 - var(--hp) * 2), 1)" }}>
          <div className="absolute -left-6 top-4 h-36 w-56 -rotate-[18deg] bg-[url(/decor-pad.svg)] bg-contain bg-no-repeat opacity-[0.18]" />
          <div className="absolute -right-6 top-6 h-36 w-56 rotate-[15deg] bg-[url(/decor-pad.svg)] bg-contain bg-no-repeat opacity-[0.18]" />
        </div>

        {/* Cả khối trượt lên (96px = 104px logo to - 8px đệm thêm khi thu nhỏ, như bản cũ). */}
        <div className="relative mx-auto max-w-6xl px-1 will-change-transform sm:px-3 md:[transform:translate3d(0,calc(var(--hp)*-96px),0)]">
          {/* Nền pill ĐẶC: hiện dần, từ hẹp nở ra + trượt nhẹ vào vị trí.
              Lớp ngoài chỉ định vị (absolute), lớp trong mới mang .edge:
              .edge đặt position:relative trong globals.css nên KHÔNG được gộp chung với absolute. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 origin-center will-change-transform"
            style={{
              opacity: "clamp(0, calc(var(--hp) * 3), 1)",
              transform: "translate3d(0, calc((1 - var(--hp)) * 10px), 0) scaleX(calc(0.9 + 0.1 * var(--hp)))",
            }}
          >
            <div className="edge h-full rounded-[28px] bg-[#100c20] shadow-lg shadow-black/40" />
          </div>

          {/* Vạch gradient dưới menu: ở đầu trang dài hết hàng menu, cuộn xuống thì co về giữa rồi biến mất */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-0 hidden h-px origin-center bg-gradient-to-r from-transparent via-berry/50 to-transparent will-change-transform md:block"
            style={{
              opacity: "clamp(0, calc(1 - var(--hp) * 2), 1)",
              transform: "scaleX(calc(1 - var(--hp) * 0.6))",
            }}
          />

          {/* Tầng 1 (từ md): logo to ở giữa, mờ + thu nhỏ khi cuộn */}
          <div
            data-big
            className="pointer-events-auto relative hidden h-[104px] items-center justify-center md:flex"
            style={{ opacity: "calc(1 - var(--hp) * 1.6)" }}
          >
            <div
              className="flex shrink-0 items-center gap-5 will-change-transform"
              style={{ transform: "scale(calc(1.5 - 0.5 * var(--hp)))" }}
            >
              {brandBig ?? brand}
            </div>
          </div>

          {/* Tầng 2: [logo nhỏ] [menu căn giữa] [công cụ] */}
          <div className="pointer-events-auto relative flex h-14 items-center gap-2 md:grid md:grid-cols-[1fr_auto_1fr]">
            <div
              data-small
              className="shrink-0 justify-self-start whitespace-nowrap max-md:opacity-100!"
              style={{ opacity: "clamp(0, calc((var(--hp) - 0.35) * 2.5), 1)" }}
            >
              {brand}
            </div>
            {nav}
            <div className="ml-auto flex shrink-0 items-center gap-1 justify-self-end sm:gap-1.5 whitespace-nowrap will-change-transform md:ml-0 xl:[transform:translate3d(0,calc((1-var(--hp))*-80px),0)]">
              {tools}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
