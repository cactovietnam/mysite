import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/data/site";
import { donateConfig } from "@/data/donate";
import DonateCard from "@/components/DonateCard";
import PayDonate from "@/components/PayDonate";

export const metadata: Metadata = {
  title: "Donate — Ủng hộ " + site.name,
  description: donateConfig.subtitle,
  alternates: { canonical: "/donate" },
};

export default function DonatePage() {
  if (!donateConfig.enabled) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:pt-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-berry sm:text-5xl">
          {donateConfig.title}
        </h1>
        {donateConfig.subtitle && <p className="mt-3 text-base text-haze sm:text-lg">{donateConfig.subtitle}</p>}
      </div>
      {/* QR tự động theo từng đơn; DonateCard bên dưới là QR tĩnh dự phòng */}
      <PayDonate />
      <DonateCard cfg={donateConfig} />
    </main>
  );
}
