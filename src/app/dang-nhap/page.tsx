import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/auth/AuthGate";
import LoginForm from "@/components/auth/LoginForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Đăng nhập" subtitle="Chào mừng trở lại GSVH."
    footer={<p>Chưa có tài khoản? <Link href="/dang-ky" className="font-medium text-berry transition hover:underline">Đăng ký</Link></p>}>
      <AuthGate><LoginForm /></AuthGate>
    </AuthShell>
  );
}
