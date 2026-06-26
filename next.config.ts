import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
