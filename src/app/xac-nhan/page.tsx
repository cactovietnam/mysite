import type { Metadata } from "next";
import ConfirmStatus from "@/components/auth/ConfirmStatus";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Xác nhận email", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell title="Xác nhận email">
      <ConfirmStatus />
    </AuthShell>
  );
}
