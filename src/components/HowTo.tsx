import { site } from "@/data/site";

const STEPS = [
  { title: "Chọn game", text: "Dùng bộ lọc hoặc Ctrl K để tìm game theo tên, tag hay engine." },
  { title: "Tải xuống", text: "Bấm nút Tải xuống rồi chọn một nơi tải. Link nào lỗi thì thử link khác." },
  { title: "Giải nén và chơi", text: "Giải nén bằng 7-Zip hoặc WinRAR, sau đó chạy file .exe trong thư mục game." },
];

// Hướng dẫn 3 bước + lời mời vào Discord (chỉ hiện khi site.json có link Discord hợp lệ).
export default function HowTo() {
  const hasDiscord = /^https?:\/\//i.test(site.discord);

  return (
    <section id="huong-dan" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
      <h2 className="mb-6 font-display text-3xl font-bold tracking-tight">Cách tải và chơi</h2>

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="glass relative overflow-hidden rounded-xl p-6">
            <span className="grid size-9 place-items-center rounded-full bg-berry/15 font-display text-sm font-bold text-berry">{i + 1}</span>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-haze">{s.text}</p>
          </li>
        ))}
      </ol>

      {hasDiscord && (
        <div className="glass relative mt-4 flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl p-7 sm:flex-row sm:items-center sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0"
               style={{ background: "radial-gradient(50% 120% at 100% 50%, rgba(124,92,255,0.28), transparent 70%), radial-gradient(40% 100% at 0% 0%, rgba(255,107,152,0.16), transparent 70%)" }} />
          <div className="relative">
            <h3 className="font-display text-2xl font-bold tracking-tight">Cần hỗ trợ hoặc báo link lỗi?</h3>
            <p className="mt-1.5 text-haze">Vào Discord để hỏi nhanh và nhận thông báo khi có game mới.</p>
          </div>
          <a href={site.discord} target="_blank" rel="noopener noreferrer"
             className="relative shrink-0 rounded-lg bg-berry px-7 py-3.5 font-semibold text-ink transition duration-300 active:scale-95">
            {site.nav.discord}
          </a>
        </div>
      )}
    </section>
  );
}
