import type { NextConfig } from "next";

// Browser security headers for every page.
const securityHeaders = [
  // Don't let other sites show our pages inside theirs (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Don't guess file types (an uploaded file can't pretend to be a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only our domain, never full page addresses, to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera only for our own pages (QR scanner); nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Always use HTTPS for two years, including www.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Envelope photos are shrunk to ~150 KB on the phone; this leaves room for
    // an uncompressed fallback photo.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
