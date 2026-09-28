import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Dev server only (no effect in production builds): allow both local
  // hosts. Without this, opening via 127.0.0.1 while the dev origin list
  // defaults to localhost blocks the HMR socket and hydration never
  // attaches — the page renders but effects/API calls never fire.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
