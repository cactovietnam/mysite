import type { Metadata } from "next";
import Saved from "@/components/account/Saved";

export const metadata: Metadata = { title: "Yêu thích & Đã xem", robots: { index: false, follow: false } };

export default function Page() {
  return <Saved />;
}
