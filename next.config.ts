import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.EDUTRACK_PREVIEW === "1" ? ".next-preview" : ".next",
  experimental: { cpus: 1 },
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
