import type { MetadataRoute } from "next";
import { games } from "@/data/games";
import { siteUrl } from "@/data/site";
import { donateConfig } from "@/data/donate";

// /sitemap.xml: trang chủ, trang Donate (nếu bật) + mỗi game một dòng. lastModified lấy từ updatedAt của game nên Google biết trang nào mới đổi.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return []; // site.json -> url sai: bỏ qua thay vì làm build chết
  const latest = games.reduce((m, g) => (g.updatedAt > m ? g.updatedAt : m), "");
  return [
    { url: new URL("/", siteUrl).href, lastModified: latest || undefined, changeFrequency: "daily", priority: 1 },
    ...(donateConfig.enabled
      ? [{ url: new URL("/donate", siteUrl).href, changeFrequency: "monthly" as const, priority: 0.5 }]
      : []),
    ...games.map((g) => ({
      url: new URL(`/game/${g.slug}`, siteUrl).href,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
