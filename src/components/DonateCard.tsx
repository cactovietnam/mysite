"use client";

import { useEffect, useRef, useState } from "react";
import type { DonateConfig } from "@/data/donate";

/** Chỉ cho dùng QR dự phòng VietQR khi dữ liệu trông như thật (tránh sinh QR giả từ giá trị mẫu). */
function vietQrUrl(cfg: DonateConfig): string | null {
  const bank = cfg.bankName.replace(/\s+/g, "");
  const acc = cfg.accountNumber;
  if (!/^[A-Za-z0-9]{2,20}$/.test(bank)) return null; // mã ngân hàng: ASCII, không dấu/khoảng trắng
  if (!/^\d{6,19}$/.test(acc) || /^0+$/.test(acc)) return null; // STK: 6-19 chữ số, không phải số 0 mẫu
  const name = cfg.accountHolder ? `?accountName=${encodeURIComponent(cfg.accountHolder)}` : "";
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.png${name}`;
}

/** Tải file về máy bằng thẻ <a> tạm. */
function triggerDownload(href: string, filename: string, newTab = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

type QrStage = "primary" | "fallback" | "none";

export default function DonateCard({ cfg }: { cfg: DonateConfig }) {
  const fallback = vietQrUrl(cfg);
  const [stage, setStage] = useState<QrStage>(cfg.qrImage ? "primary" : fallback ? "fallback" : "none");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const activeQrSrc = stage === "primary" ? cfg.qrImage : stage === "fallback" && fallback ? fallback : "";

  // Ảnh chính lỗi -> thử VietQR (nếu hợp lệ) -> không được thì hiện khung giữ chỗ.
  const onQrError = () => setStage((s) => (s === "primary" && fallback ? "fallback" : "none"));

  async function saveQr() {
    if (!activeQrSrc) return;
    try {
      const res = await fetch(activeQrSrc);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      triggerDownload(url, "qr-donate.png");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      triggerDownload(activeQrSrc, "qr-donate.png", true); // vướng CORS: mở/tải trực tiếp
    }
  }

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(cfg.accountNumber);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Sao chép số tài khoản (Ctrl+C):", cfg.accountNumber); // trình duyệt chặn clipboard
    }
  }

  const rows = [
    { label: "Ngân hàng", value: cfg.bankName, cls: "" },
    { label: "STK", value: cfg.accountNumber, cls: "tabular-nums" },
    { label: "Chủ TK", value: cfg.accountHolder, cls: "uppercase" },
    { label: "Nội dung", value: cfg.transferContent, cls: "" },
  ].filter((r) => r.value);

  return (
    <section className="glass anim-pop mx-auto mt-8 max-w-2xl rounded-[2rem] p-6 text-center shadow-2xl shadow-black/50 sm:p-10">
      <h2 className="font-display text-xl font-bold tracking-tight text-mist sm:text-2xl">{cfg.cardTitle}</h2>

      <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-4 shadow-lg sm:p-5">
        {activeQrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeQrSrc} alt="Mã QR ủng hộ" className="size-60 object-contain sm:size-64" onError={onQrError} />
        ) : (
          <div className="flex size-60 items-center justify-center rounded-2xl bg-neutral-100 text-sm text-neutral-500 sm:size-64">
            Chưa có ảnh mã QR
          </div>
        )}
      </div>

      {cfg.qrNote && <p className="mt-4 text-sm text-haze">{cfg.qrNote}</p>}

      {rows.length > 0 && (
        <dl className="mx-auto mt-6 max-w-lg divide-y divide-white/10 rounded-2xl border border-white/10 bg-ink/40 px-5 text-left">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[110px_1fr] items-center gap-4 py-3.5 sm:grid-cols-[135px_1fr]">
              <dt className="text-sm text-haze">{r.label}</dt>
              <dd className={`font-display break-words text-sm font-bold tracking-wide text-berry sm:text-base ${r.cls}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={saveQr}
          disabled={!activeQrSrc}
          title={activeQrSrc ? undefined : "Chưa có ảnh mã QR"}
          className="inline-flex items-center gap-2 rounded-xl bg-berry px-6 py-3 text-sm font-semibold text-ink shadow-[0_14px_36px_-12px_var(--color-berry)] transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Lưu mã QR
        </button>
        {cfg.accountNumber && (
          <button
            type="button"
            onClick={copyAccount}
            className="glass rounded-xl px-6 py-3 text-sm font-semibold text-mist transition hover:-translate-y-0.5 hover:bg-white/15 active:scale-95"
          >
            {copied ? "Đã sao chép STK!" : "Sao chép số tài khoản"}
          </button>
        )}
      </div>
    </section>
  );
}
