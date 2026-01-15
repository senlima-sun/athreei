import "./instrument"

import app from "./app"
import { initDatabase } from "./lib/db"
import { logger } from "./lib/logger"

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || "localhost"

try {
  initDatabase()
  logger.info("Database connection initialized")
} catch (error) {
  logger.error("Failed to initialize database", { error })
  process.exit(1)
}

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
}

logger.info("API server started", { host: HOST, port: PORT })
