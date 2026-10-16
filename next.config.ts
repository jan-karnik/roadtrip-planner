import type { NextConfig } from "next";

// Applied to every response. Deliberately no script/style CSP yet: Mapbox GL
// needs blob: workers and its own hosts, and that policy wants browser testing.
// These directives restrict framing and form posts only, so they can't break
// resource loading.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // /live reads GPS; nothing uses the camera or microphone.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  // Browsers ignore HSTS over plain HTTP, so this is a no-op in local dev.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
