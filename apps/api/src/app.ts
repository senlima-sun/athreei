import { Hono } from "hono"
import { cors } from "hono/cors"
import {
  healthRoutes,
  configRoutes,
  organizationsRoutes,
  endpointsRoutes,
  apiKeysRoutes,
  mcpServersRoutes,
  namespacesRoutes,
  gatewayRoutes,
  tracesRoutes,
  toolsRoutes,
  registryRoutes,
  cliAuthRoutes,
  profileRoutes,
  sessionsRoutes,
  dashboardRoutes,
  auditRoutes,
  permissionsRoutes,
  skillsRoutes,
  rulesRoutes,
  evaluationsRoutes,
  marketplacesRoutes,
  pluginsRoutes,
  pluginInstallationsRoutes,
  organizationMarketplaceRoutes,
  adminMarketplacesRoutes,
} from "./routes"
import { errorHandler, notFoundHandler } from "./middleware"
import { getAuth } from "./lib/auth"
import { apiLogger } from "./lib/logger"

const app = new Hono()

app.use("*", apiLogger())

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || []

      if (process.env.NODE_ENV === "production") {
        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
      }

      if (origin) return origin
      return allowedOrigins[0] || "http://localhost:3000"
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
  })
)

app.route("/health", healthRoutes)
app.route("/api/config", configRoutes)
app.route("/api/registry", registryRoutes)
app.route("/api/auth/cli", cliAuthRoutes)

app.on(
  ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  "/api/auth/*",
  async (c) => {
    const auth = getAuth()
    return auth.handler(c.req.raw)
  }
)

app.route("/api/organizations", organizationsRoutes)
app.route("/api/endpoints", endpointsRoutes)
app.route("/api/endpoints", apiKeysRoutes)
app.route("/api/mcp-servers", mcpServersRoutes)
app.route("/api/namespaces", namespacesRoutes)
app.route("/api/gateway", gatewayRoutes)
app.route("/api/traces", tracesRoutes)
app.route("/api/tools", toolsRoutes)
app.route("/api/profile", profileRoutes)
app.route("/api/sessions", sessionsRoutes)
app.route("/api/dashboard", dashboardRoutes)
app.route("/api/audit", auditRoutes)
app.route("/api/permissions", permissionsRoutes)
app.route("/api/skills", skillsRoutes)
app.route("/api/rules", rulesRoutes)
app.route("/api/evaluations", evaluationsRoutes)
app.route("/api/marketplaces", marketplacesRoutes)
app.route("/api/plugins", pluginsRoutes)
app.route("/api/organizations", pluginInstallationsRoutes)
app.route("/api/organizations", organizationMarketplaceRoutes)
app.route("/api/admin", adminMarketplacesRoutes)

app.notFound(notFoundHandler)
app.onError(errorHandler)

export default app
