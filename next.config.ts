import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@xmldom/xmldom", "jszip"],
};

export default nextConfig;
