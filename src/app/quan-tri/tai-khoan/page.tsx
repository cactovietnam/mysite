import type { Metadata } from "next";
import AccountTool from "@/components/admin/AccountTool";

export const metadata: Metadata = { title: "Quản lý tài khoản", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Quản lý tài khoản</h1>
      <p className="mt-3 text-haze">Tìm tài khoản theo tên, đặt lại mật khẩu hoặc mở khóa đăng nhập. Chỉ dành cho quản trị viên.</p>
      <div className="mt-8"><AccountTool /></div>
    </main>
  );
}
