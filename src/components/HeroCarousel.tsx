"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "@/data/games";
import { accentStyle, fmtDate } from "@/lib/game-ui";
import { site } from "@/data/site";
import Cover from "./Cover";
import EngineChip from "./EngineChip";

const INTERVAL = 6500;
const SWIPE_PX = 50;
const ctrl = "glass grid size-11 place-items-center rounded-full transition hover:bg-white/20 active:scale-95";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 rounded-full bg-white/10 px-3.5 py-1">
      <span className="text-xs text-haze">{label}</span>
      <span className="font-semibold tabular-nums text-mist">{value}</span>
    </span>
  );
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === "l" ? "m12 4-6 6 6 6" : "m8 4 6 6-6 6"} />
  </svg>
);

// Banner trượt: game mới cập nhật. Tự chạy, dừng khi rê chuột / bấm "Tạm dừng" / tab ẩn / người dùng giảm chuyển động.
// --accent của cả khối đổi theo game đang hiện nên nút, glow, thanh tiến trình luôn ăn màu ảnh.
export default function HeroCarousel({ games }: { games: Game[] }) {
  const n = games.length;
  const [i, setI] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [away, setAway] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(mq.matches);
    const syncVis = () => setAway(document.hidden);
    syncMotion(); syncVis();
    mq.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVis);
    return () => { mq.removeEventListener("change", syncMotion); document.removeEventListener("visibilitychange", syncVis); };
  }, []);

  const playing = n > 1 && !userPaused && !hover && !away && !reduced;
  const go = useCallback((d: number) => setI((c) => (c + d + n) % n), [n]);

  // đổi slide thủ công (i đổi) thì bộ đếm chạy lại từ đầu
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(t);
  }, [playing, i, go]);

  if (n === 0) return null;
  const cur = games[Math.min(i, n - 1)];

  return (
    <section aria-roledescription="carousel" aria-label="Game mới cập nhật" className="mx-auto mt-4 max-w-6xl px-4" style={accentStyle(cur)}>
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-plum"
           onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(true); }}
           onPointerLeave={() => setHover(false)}
           onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
           onTouchEnd={(e) => {
             if (touchX.current === null) return;
             const dx = e.changedTouches[0].clientX - touchX.current;
             touchX.current = null;
             if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
           }}>
        {/* mọi slide xếp chồng trong cùng 1 ô lưới: khung cao bằng slide cao nhất, chuyển slide bằng opacity */}
        <div className="grid" aria-live={playing ? "off" : "polite"}>
          {games.map((g, idx) => {
            const active = idx === i;
            return (
              <article key={g.slug} role="group" aria-roledescription="slide" aria-label={`${idx + 1} / ${n}`}
                       aria-hidden={!active} inert={!active}
                       className={`relative isolate flex min-h-[500px] items-center overflow-hidden transition-opacity duration-700 [grid-area:1/1] md:min-h-[540px] ${
                         active ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                <div aria-hidden className="absolute inset-0 -z-10 bg-cover" style={g.blur ? { backgroundImage: `url("${g.blur}")` } : undefined}>
                  <Cover decorative priority={idx === 0} src={g.cover} title={g.title} engine={g.engine}
                         className={`h-full w-full object-cover object-[60%_25%] transition-transform duration-[8000ms] ease-out ${active ? "scale-105" : "scale-100"}`} />
                  <div className="absolute inset-0"
                       style={{ background: `radial-gradient(55% 80% at 90% 10%, color-mix(in srgb, ${g.accent ?? "var(--accent)"} 32%, transparent), transparent 70%)` }} />
                  <div className="absolute inset-0 hidden md:block"
                       style={{ background: "linear-gradient(90deg, rgba(15,12,26,0.94) 0%, rgba(15,12,26,0.78) 34%, rgba(15,12,26,0.25) 66%, rgba(15,12,26,0) 100%)" }} />
                  <div className="absolute inset-0 md:hidden"
                       style={{ background: "linear-gradient(180deg, rgba(15,12,26,0.35) 0%, rgba(15,12,26,0.55) 40%, rgba(15,12,26,0.95) 100%)" }} />
                  <div className="absolute inset-0"
                       style={{ background: "linear-gradient(0deg, #1a1530 0%, rgba(26,21,48,0) 28%)" }} />
                </div>

                <div className="w-full px-6 pb-24 pt-14 sm:px-10 md:px-20 md:pb-24">
                  <p className="inline-flex items-center gap-2.5 rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent ring-1 ring-accent/30">
                    <span className="relative flex size-2">
                      {active && playing && <span className="absolute inset-0 animate-ping rounded-full bg-accent/70" />}
                      <span className="relative size-2 rounded-full bg-accent" />
                    </span>
                    {site.home.featuredBadge}
                  </p>

                  <h2 className="mt-5 line-clamp-3 max-w-[20ch] font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-balance sm:text-5xl md:text-6xl">
                    {g.title}
                  </h2>
                  <p className="mt-5 line-clamp-3 max-w-[56ch] text-base leading-relaxed text-white/75 sm:text-lg">{g.description}</p>

                  <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm">
                    <EngineChip engine={g.engine} className="bg-accent/10 text-mist ring-1 ring-accent/40" />
                    <Meta label="Phiên bản" value={g.version} />
                    <Meta label="Dung lượng" value={`${g.sizeGB}GB`} />
                    <Meta label="Cập nhật" value={fmtDate(g.updatedAt)} />
                  </div>

                  <Link href={`/game/${g.slug}`}
                        className="group mt-8 inline-flex items-center gap-3 rounded-full bg-accent py-3 pl-7 pr-4 font-semibold text-on-accent shadow-[0_14px_36px_-12px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_var(--accent)] active:translate-y-0">
                    {site.home.featuredButton}
                    <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 10h12m0 0-5-5m5 5-5 5" />
                    </svg>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Game trước" className={`${ctrl} absolute left-4 top-1/2 hidden -translate-y-1/2 md:grid`}><Chevron dir="l" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Game sau" className={`${ctrl} absolute right-4 top-1/2 hidden -translate-y-1/2 md:grid`}><Chevron dir="r" /></button>

            <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 px-4 md:justify-end md:pr-8">
              <span className="text-xs font-medium tabular-nums text-haze" aria-hidden>
                {String(i + 1).padStart(2, "0")}/{String(n).padStart(2, "0")}
              </span>
              <div className="flex items-center" role="group" aria-label="Chọn slide">
                {games.map((g, idx) => {
                  const active = idx === i;
                  return (
                    <button key={g.slug} type="button" onClick={() => setI(idx)} aria-label={`Xem ${g.title}`} aria-current={active || undefined}
                            className="grid h-6 place-items-center px-1">
                      <span className={`block h-1.5 overflow-hidden rounded-full bg-white/25 transition-[width] duration-300 ${active ? "w-10" : "w-2.5"}`}>
                        {active && (
                          <span key={`${i}-${playing}`} className="block h-full origin-left rounded-full bg-accent"
                                style={playing ? { animation: `fill ${INTERVAL}ms linear forwards` } : undefined} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!reduced && (
                <button type="button" onClick={() => setUserPaused((p) => !p)} aria-pressed={userPaused}
                        className="glass rounded-full px-4 py-1.5 text-xs font-semibold transition hover:bg-white/15 active:scale-95">
                  {userPaused ? "Phát" : "Tạm dừng"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
