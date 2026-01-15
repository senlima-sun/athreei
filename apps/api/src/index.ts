import "./instrument"

import app from "./app"
import { initDatabase } from "./lib/db"

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || "localhost"

try {
  initDatabase()
  console.log("Database connection initialized")
} catch (error) {
  console.error("Failed to initialize database:", error)
  process.exit(1)
}

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
}

console.log(`API server running on http://${HOST}:${PORT}`)
