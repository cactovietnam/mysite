"use client";
import { useEffect } from "react";

// Chạy khi chính root layout bị crash (lỗi render mà ClientErrorReporter không bắt được).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, path: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2>Trang gặp lỗi</h2>
        <p>Lỗi đã được ghi nhận. Bạn có thể tải lại trang, hoặc báo cho chúng tôi qua Discord hoặc Facebook.</p>
        <button onClick={reset}>Thử lại</button>
      </body>
    </html>
  );
}
