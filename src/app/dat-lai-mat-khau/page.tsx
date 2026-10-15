import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Đặt lại mật khẩu", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Chọn mật khẩu mới cho tài khoản của bạn."
    footer={<Link href="/dang-nhap" className="font-medium text-berry transition hover:underline">Quay lại đăng nhập</Link>}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
