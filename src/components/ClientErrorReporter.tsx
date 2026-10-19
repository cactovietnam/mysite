"use client";
import { useEffect } from "react";

const NOISE = /ResizeObserver|Script error|chrome-extension|moz-extension/i; // lỗi vô hại / do tiện ích trình duyệt

function send(message: string, stack?: string) {
  if (!message || NOISE.test(message) || NOISE.test(stack ?? "")) return;
  const body = JSON.stringify({ message, stack, path: location.pathname });
  const ok = navigator.sendBeacon?.("/api/report-error", new Blob([body], { type: "application/json" }));
  if (!ok) fetch("/api/report-error", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => send(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => send(String(e.reason?.message ?? e.reason), e.reason?.stack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
