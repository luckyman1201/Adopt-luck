import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "data.amverse.co" },
      { protocol: "https", hostname: "elvebredd.com" },
      { protocol: "https", hostname: "www.elvebredd.com" },
      { protocol: "https", hostname: "tr.rbxcdn.com" },
      { protocol: "https", hostname: "thumbnails.roblox.com" },
      { protocol: "https", hostname: "www.roblox.com" },
    ],
  },
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
