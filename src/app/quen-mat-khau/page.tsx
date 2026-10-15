import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/auth/AuthGate";
import EmailForm from "@/components/auth/EmailForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu."
    footer={<Link href="/dang-nhap" className="font-medium text-berry transition hover:underline">Quay lại đăng nhập</Link>}>
      <AuthGate><EmailForm mode="reset" /></AuthGate>
    </AuthShell>
  );
}
