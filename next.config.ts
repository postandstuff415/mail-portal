import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Envelope photos are shrunk to ~150 KB on the phone; this leaves room for
    // an uncompressed fallback photo.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
