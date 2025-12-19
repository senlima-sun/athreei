/**
 * Main Hono API application
 *
 * This file sets up the main Hono app with CORS configuration
 * and mounts all route groups for the athreei dashboard backend.
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { auditRouter } from "./routes/audit"
import { permissionsRouter } from "./routes/permissions"
import { sessionsRouter } from "./routes/sessions"
import { statusRouter } from "./routes/status"

// Create main Hono app
const app = new Hono()

// Configure CORS for local development
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "athreei-api",
    version: "0.1.0",
    status: "ok",
  })
})

// Mount route groups
app.route("/api/audit", auditRouter)
app.route("/api/permissions", permissionsRouter)
app.route("/api/sessions", sessionsRouter)
app.route("/api/status", statusRouter)

export default app
