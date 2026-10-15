"use client";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/supabase";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loader: Promise<void> | null = null;
const loadScript = () =>
  (loader ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { loader = null; reject(new Error("turnstile")); };
    document.head.appendChild(s);
  }));

// Cloudflare Turnstile. onToken(token) khi qua xác minh, onToken(null) khi hết hạn/lỗi.
// Token chỉ dùng được MỘT lần: sau mỗi lần gửi form, cha tăng resetKey để lấy token mới.
export default function Turnstile({ onToken, resetKey = 0 }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  const [failed, setFailed] = useState(false);
  useEffect(() => { cb.current = onToken; });

  useEffect(() => {
    let dead = false;
    loadScript().then(
      () => {
        const el = box.current, api = window.turnstile;
        if (dead || !el || !api) return;
        widget.current = api.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          size: "flexible",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      },
      () => { if (!dead) setFailed(true); },
    );
    return () => {
      dead = true;
      if (widget.current) { window.turnstile?.remove(widget.current); widget.current = null; }
    };
  }, []);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (failed) {
    return <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
      Không tải được bước xác minh của Cloudflare. Tắt trình chặn quảng cáo cho trang này rồi tải lại.
    </p>;
  }
  return <div ref={box} className="min-h-[65px]" />;
}
