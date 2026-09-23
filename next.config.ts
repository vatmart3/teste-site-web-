import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les plates/vidéos sont servies telles quelles depuis /public (déjà optimisées par tools/depth.py).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:dir(scenes|characters|audio)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
