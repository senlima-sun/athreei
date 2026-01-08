import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const isLocalBuild = process.env.ATHREEI_MODE === "local"

const nextConfig: NextConfig = {
  // Local mode: static export for distribution
  // Cloud mode: standalone for Docker deployments
  output: isLocalBuild ? "export" : "standalone",

  // Static export requires unoptimized images
  images: {
    unoptimized: isLocalBuild,
  },

  // Environment variables for client
  env: {
    NEXT_PUBLIC_ATHREEI_MODE: process.env.ATHREEI_MODE,
  },
}

export default withSentryConfig(nextConfig, {
  // Disable source map upload for now
  sourcemaps: {
    disable: true,
  },
})
