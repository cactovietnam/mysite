import type { Metadata } from "next";
import KeyVault from "@/components/KeyVault";

export const metadata: Metadata = { title: "Key đã mua", robots: { index: false, follow: false } };

export default function Page() {
  return <KeyVault />;
}
