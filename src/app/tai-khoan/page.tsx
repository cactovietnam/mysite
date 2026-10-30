import type { Metadata } from "next";
import Collection from "@/components/account/Collection";

export const metadata: Metadata = { title: "Bộ sưu tập", robots: { index: false, follow: false } };

export default function Page() {
  return <Collection />;
}
