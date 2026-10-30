import type { Metadata } from "next";
import KeyVault from "@/components/KeyVault";

export const metadata: Metadata = { title: "Key đã mua", robots: { index: false, follow: false } };

// Thanh tab cũ (AccountTabs) đã được thay bằng AccountNav trong layout.tsx.
export default function Page() {
  return <KeyVault />;
}
