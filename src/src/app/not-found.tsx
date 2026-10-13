import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Không tìm thấy trang này</h1>
      <p className="mt-4 text-haze">Game có thể đã bị xóa hoặc đường dẫn bị sai. Quay lại kho game để chọn game khác.</p>
      <Link href="/" className="mt-8 rounded-full bg-berry px-7 py-3.5 font-semibold text-ink transition hover:-translate-y-0.5">
        Về kho game
      </Link>
    </main>
  );
}
