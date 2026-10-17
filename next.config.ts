import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Tên file ảnh trong public/covers là hash nội dung (quan_ly.py) nên cache vĩnh viễn là an toàn.
  async headers() {
    return [
      { source: "/covers/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
