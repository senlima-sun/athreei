import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  // Output as standalone for Docker deployments
  output: "standalone",
}

export default withSentryConfig(nextConfig, {
  // Disable source map upload for now
  sourcemaps: {
    disable: true,
  },
})
