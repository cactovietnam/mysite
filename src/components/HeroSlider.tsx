"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/data/games";
import { site } from "@/data/site";
import { accentStyle, fmtDate } from "@/lib/game-ui";
import Cover from "./Cover";
import EngineChip from "./EngineChip";

const INTERVAL = 6500;
const SWIPE_PX = 50;

const arrow =
  "glass absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full transition hover:bg-white/20 active:scale-95 sm:grid";

// Slider game mới cập nhật: ảnh chính full-bleed, chuyển mờ dần (opacity), màu nhấn theo từng game.
// Tự chạy mỗi 6.5s; dừng khi rê chuột, bấm "Tạm dừng", hoặc người dùng bật prefers-reduced-motion.
export default function HeroSlider({ games }: { games: Game[] }) {
  const n = games.length;
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = (d: number) => setCur((c) => (c + d + n) % n);

  // setTimeout (không phải setInterval) và phụ thuộc `cur`: bấm tay xong là đếm lại 6.5s từ đầu.
  useEffect(() => {
    if (!playing || hover || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setCur((c) => (c + 1) % n), INTERVAL);
    return () => clearTimeout(t);
  }, [playing, hover, n, cur]);

  if (n === 0) return null;
  const multi = n > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={site.home.featuredBadge}
      className="mx-auto mt-6 max-w-6xl px-4"
      style={accentStyle(games[cur])}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(true); }}
      onPointerLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        className="relative isolate h-[520px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-plum md:h-[560px]"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !multi) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
        }}
      >
        <div aria-live={playing ? "off" : "polite"} className="absolute inset-0">
          {games.map((s, i) => {
            const on = i === cur;
            return (
              <article
                key={s.slug}
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${n}`}
                aria-hidden={!on}
                inert={!on}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {/* nền: ảnh mờ 32px hiện ngay, ảnh thật phủ lên khi tải xong */}
                <div aria-hidden className="absolute inset-0 bg-cover bg-center"
                     style={s.blur ? { backgroundImage: `url("${s.blur}")` } : undefined}>
                  <Cover decorative priority={i === 0} src={s.cover} title={s.title} engine={s.engine}
                         className={`h-full w-full object-cover object-[50%_25%] transition-transform duration-[6500ms] ease-out ${on ? "scale-105" : "scale-100"}`} />
                </div>
                <div aria-hidden className="absolute inset-0"
                     style={{ background: "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%), linear-gradient(0deg, #0f0c1a 3%, rgba(15,12,26,0.82) 36%, rgba(15,12,26,0.2) 72%, rgba(15,12,26,0.35) 100%)" }} />

                <div className="relative flex h-full flex-col items-center justify-end px-5 pb-20 text-center sm:px-20 sm:pb-16">
                  <p className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
                    <span className="relative flex size-2">
                      {on && <span className="absolute inset-0 animate-ping rounded-full bg-accent/70" />}
                      <span className="relative size-2 rounded-full bg-accent" />
                    </span>
                    {site.home.featuredBadge} · {s.sizeGB}GB
                  </p>

                  <h2 className="mt-5 line-clamp-3 max-w-4xl font-display text-3xl font-extrabold leading-[1.04] tracking-tight text-balance [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl">
                    {s.title}
                  </h2>

                  <p className="mt-4 line-clamp-2 max-w-[62ch] text-base leading-relaxed text-white/75 sm:text-lg">{s.description}</p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
                    <EngineChip engine={s.engine} className="glass ring-1 ring-accent/45" />
                    <span className="glass rounded-full px-3.5 py-1 tabular-nums">v{s.version}</span>
                    <span className="glass hidden rounded-full px-3.5 py-1 tabular-nums sm:inline">{fmtDate(s.updatedAt)}</span>
                  </div>

                  <Link href={`/game/${s.slug}`}
                        className="group mt-7 inline-flex items-center gap-3 rounded-full bg-accent py-2.5 pl-7 pr-2.5 font-semibold text-on-accent shadow-[0_14px_36px_-12px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_var(--accent)] active:scale-95">
                    {site.home.featuredButton}
                    <span className="grid size-9 place-items-center rounded-full bg-ink/15 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-ink/25">
                      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 10h12m0 0-4-4m4 4-4 4" />
                      </svg>
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {multi && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Game trước" className={`${arrow} left-4`}>
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m12 4-6 6 6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Game sau" className={`${arrow} right-4`}>
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m8 4 6 6-6 6" />
              </svg>
            </button>

            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-3">
              <div className="flex items-center">
                {games.map((s, i) => (
                  <button key={s.slug} type="button" onClick={() => setCur(i)}
                          aria-label={`Xem ${s.title}`} aria-current={i === cur}
                          className="grid h-8 place-items-center px-1">
                    <span className={`block h-2 rounded-full transition-all duration-300 ${i === cur ? "w-8 bg-accent" : "w-2 bg-white/35 hover:bg-white/60"}`} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}
                      className="glass rounded-full px-3.5 py-1 text-xs font-medium transition hover:bg-white/20 active:scale-95">
                {playing ? "Tạm dừng" : "Phát"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
