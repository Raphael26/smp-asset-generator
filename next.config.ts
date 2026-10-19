import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local tool: every page reads fresh data from SQLite, so nothing is prerendered or cached.
  cacheComponents: false,
  partialPrefetching: false,
  // Native or browser-driving packages are loaded with Node's require instead of being bundled.
  serverExternalPackages: ["better-sqlite3", "sharp", "playwright-core", "pptxgenjs"],
  // The dev badge would otherwise appear in exported images.
  devIndicators: false,
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
