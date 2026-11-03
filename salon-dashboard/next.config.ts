import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  allowedDevOrigins: ["192.168.18.16"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    turbopackFileSystemCacheForDev: false,
  },
};


export default nextConfig;

