import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Иначе Turbopack может подмешать устаревший/обрезанный Prisma Client — падают findMany/create с include. */
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "https", hostname: "**", pathname: "/**" },
    ],
  },
};

export default nextConfig;
