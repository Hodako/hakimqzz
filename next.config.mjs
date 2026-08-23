import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isStatic = process.env.EXPORT_STATIC === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 15 top-level whitelist for dev origins
  allowedDevOrigins: [
    "hakim.qzz.io",
    "*.qzz.io",
    "localhost:3141",
    "localhost:3000",
    "0.0.0.0:3141",
    "127.0.0.1:3141",
  ],
  ...(isStatic
    ? {
        output: "export",
        images: {
          unoptimized: true,
        },
      }
    : {
        // Allow camera access via HTTP headers for mobile WebView + browsers & optimize chunk cache
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                {
                  key: "Permissions-Policy",
                  value: "camera=*, microphone=(), geolocation=()",
                },
              ],
            },
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/sw.js",
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-cache, no-store, must-revalidate",
                },
              ],
            },
          ];
        },
      }),
  // Allow MongoDB server-side code to build properly
  serverExternalPackages: ["mongodb"],
  eslint: {
    // Disable ESLint during production build since we lint separately
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript build errors temporarily during initial migration steps
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
