import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No standalone output — let the platform handle deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
