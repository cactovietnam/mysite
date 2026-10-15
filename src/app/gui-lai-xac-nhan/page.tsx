import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/auth/AuthGate";
import EmailForm from "@/components/auth/EmailForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Gửi lại email xác nhận", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Gửi lại email xác nhận" subtitle="Nhập email bạn đã dùng để đăng ký."
    footer={<Link href="/dang-nhap" className="font-medium text-berry transition hover:underline">Quay lại đăng nhập</Link>}>
      <AuthGate><EmailForm mode="resend" /></AuthGate>
    </AuthShell>
  );
}
