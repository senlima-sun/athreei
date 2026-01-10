import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware } from "../middleware"
import * as controllers from "../controllers/mcp-servers"
import {
  createServerSchema,
  updateServerSchema,
  listQuerySchema,
  verifyMcpServerSchema,
  batchHealthCheckSchema,
  updateToolSchema,
} from "../schemas/mcp-servers"

const mcpServers = new Hono()

mcpServers.use("*", authMiddleware)

mcpServers.get(
  "/",
  zValidator("query", listQuerySchema),
  controllers.listServers
)

mcpServers.get("/:id", controllers.getServer)

mcpServers.get("/:id/env", controllers.getServerEnv)

mcpServers.post(
  "/",
  zValidator("json", createServerSchema),
  controllers.createServer
)

mcpServers.patch(
  "/:id",
  zValidator("json", updateServerSchema),
  controllers.updateServer
)

mcpServers.delete("/:id", controllers.deleteServer)

mcpServers.get("/:id/tools", controllers.listTools)

mcpServers.post("/:id/tools/refresh", controllers.refreshTools)

mcpServers.patch(
  "/:id/tools/:toolName",
  zValidator("json", updateToolSchema),
  controllers.updateTool
)

mcpServers.get("/:id/health", controllers.checkHealth)

mcpServers.post(
  "/health-check",
  zValidator("json", batchHealthCheckSchema),
  controllers.batchHealthCheck
)

mcpServers.post(
  "/verify",
  zValidator("json", verifyMcpServerSchema),
  controllers.verifyServer
)

export default mcpServers
