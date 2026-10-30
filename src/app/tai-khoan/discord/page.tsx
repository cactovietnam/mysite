import type { Metadata } from "next";
import DiscordLinkCard from "@/components/DiscordLinkCard";

export const metadata: Metadata = { title: "Liên kết Discord", robots: { index: false, follow: false } };

export default function Page() {
  return <DiscordLinkCard />;
}
