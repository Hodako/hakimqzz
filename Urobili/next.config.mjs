import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isStatic = process.env.EXPORT_STATIC === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStatic ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pg", "mongodb", "@whiskeysockets/baileys", "sharp"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
