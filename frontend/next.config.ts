import type { NextConfig } from "next";

// The Django backend serves everything under /api. Proxying it through Next
// keeps the browser on one origin, so the backend needs no CORS setup.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, for the Cloud Run image.
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  // Hide the Next.js "N" badge in dev so demo recordings look like the real app.
  // Compile and runtime errors are still shown.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
