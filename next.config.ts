import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Avoid walking the complete Fluent component/icon barrels in development.
    optimizePackageImports: ["@fluentui/react-components", "@fluentui/react-icons"],
  },
};

export default nextConfig;
