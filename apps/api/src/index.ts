import "./instrument"

import app from "./app"
import { initDatabase } from "./lib/db"

const PORT = process.env.PORT || 3001

try {
  initDatabase()
  console.log("Database connection initialized")
} catch (error) {
  console.error("Failed to initialize database:", error)
  process.exit(1)
}

export default {
  port: PORT,
  fetch: app.fetch,
}

console.log(`API server running on port ${PORT}`)
