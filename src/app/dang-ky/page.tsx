import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/auth/AuthGate";
import SignupForm from "@/components/auth/SignupForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Đăng ký", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Đăng ký" subtitle="Tạo tài khoản để bắt đầu."
    footer={<p>Đã có tài khoản? <Link href="/dang-nhap" className="font-medium text-berry transition hover:underline">Đăng nhập</Link></p>}>
      <AuthGate><SignupForm /></AuthGate>
    </AuthShell>
  );
}
