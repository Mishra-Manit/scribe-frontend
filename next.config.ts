import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.svdcdn.com",
      },
      {
        protocol: "https",
        hostname: "cdn.logoeps.net",
      },
    ],
  },
};

export default nextConfig;
