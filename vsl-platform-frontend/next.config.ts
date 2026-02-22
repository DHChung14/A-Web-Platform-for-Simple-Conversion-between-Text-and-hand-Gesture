import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // Enable standalone mode for Docker deployment

  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api",
  },

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['@/components'],
  },
};

export default nextConfig;
