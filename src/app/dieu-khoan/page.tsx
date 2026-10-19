import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Điều khoản & Bảo mật" };

const h2 = "scroll-mt-24 font-display text-3xl font-bold tracking-tight";
const ul = "mt-4 list-disc space-y-2 pl-6 leading-relaxed text-white/75";

// BẢN NHÁP: hãy đọc và chỉnh cho đúng thực tế vận hành của bạn trước khi mở đăng ký công khai.
export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl space-y-14 px-4 pb-24 pt-16">
      <section>
        <h1 id="dieu-khoan" className={h2}>Điều khoản dịch vụ</h1>
        <ul className={ul}>
          <li>{site.name} chỉ dành cho người từ đủ 18 tuổi trở lên.</li>
          <li>Bạn tự chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động trên tài khoản của mình.</li>
          <li>Không dùng tài khoản để spam, tấn công, giả mạo người khác hoặc phá hoại hệ thống.</li>
          <li>Chúng tôi có thể khóa tài khoản vi phạm, thay đổi hoặc ngừng dịch vụ mà không cần báo trước.</li>
          <li>Nội dung trong game là hư cấu, không đại diện cho người thật.</li>
        </ul>
      </section>

      <section>
        <h2 id="bao-mat" className={h2}>Chính sách bảo mật</h2>
        <ul className={ul}>
          <li>Chúng tôi chỉ lưu tên tài khoản và mật khẩu. Mật khẩu được băm, không ai (kể cả chúng tôi) đọc được bản gốc. Chúng tôi không thu thập email.</li>
          <li>Quên mật khẩu: liên hệ quản trị viên qua Facebook của {site.name}, chúng tôi sẽ xác minh và đặt lại giúp bạn.</li>
          <li>Dữ liệu tài khoản do Supabase lưu trữ; Cloudflare Turnstile dùng để chống bot khi đăng ký/đăng nhập.</li>
          <li>Chúng tôi không bán dữ liệu của bạn cho bên thứ ba.</li>
          <li>Muốn xóa tài khoản hoặc dữ liệu: liên hệ qua Discord của {site.name}.</li>
        </ul>
      </section>

      <Link href="/" className="inline-block font-medium text-berry hover:underline">Về trang chủ</Link>
    </main>
  );
}
