"use client";
import { useEffect } from "react";

const isChunkError = (e: Error) =>
  /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(`${e.name} ${e.message}`);

// Trang gặp lỗi: cho người dùng bấm thử lại / tải lại, không bị kẹt ở màn hình lỗi.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Lỗi thiếu file JS thường do web vừa cập nhật mà trình duyệt còn giữ bản cũ: tự tải lại đúng 1 lần.
    if (!isChunkError(error)) return;
    try {
      if (sessionStorage.getItem("chunk-reload")) return;
      sessionStorage.setItem("chunk-reload", "1");
    } catch { return; }
    window.location.reload();
  }, [error]);

  return (
    <main className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Trang gặp lỗi</h1>
      <p className="mt-4 text-haze">Có thể web vừa được cập nhật hoặc mạng bị gián đoạn. Thử lại, nếu vẫn lỗi thì tải lại cả trang.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset}
                className="rounded-full bg-berry px-7 py-3.5 font-semibold text-ink transition hover:-translate-y-0.5 active:scale-95">
          Thử lại
        </button>
        <button onClick={() => window.location.reload()}
                className="glass rounded-full px-7 py-3.5 font-semibold transition hover:bg-white/15 active:scale-95">
          Tải lại trang
        </button>
      </div>
    </main>
  );
}
