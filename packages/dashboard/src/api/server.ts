/**
 * Standalone API server
 *
 * Run this file directly to start the Hono API server on port 3001.
 * Usage: bun run src/api/server.ts
 */

import { serve } from "@hono/node-server"
import app from "./index"

const port = 3001

console.log(`Starting athreei API server on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server running at http://localhost:${port}`)
console.log(`Health check: http://localhost:${port}/api/status/health`)
