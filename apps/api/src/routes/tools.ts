import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { logger } from "../lib/logger"
import { mcpTool, mcpServer } from "@athreei/db"
import { listToolsQuerySchema, updateToolSchema } from "../schemas/tools"
import { verifyOrganizationMembership } from "../services"

const tools = new Hono()

tools.use("*", authMiddleware)

tools.get("/", zValidator("query", listToolsQuerySchema), async (c) => {
  const auth = getAuthContext(c)
  const { serverId } = c.req.valid("query")
  const dbQuery = db().query

  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("Server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const toolsList = await dbQuery.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  return c.json({
    tools: toolsList.map(
      (t: {
        id: string
        serverId: string
        name: string
        description: string | null
        inputSchema: string | null
        customDescription: string | null
        customPrompt: string | null
        isEnabled: string
        createdAt: Date
        updatedAt: Date
      }) => ({
        id: t.id,
        serverId: t.serverId,
        name: t.name,
        description: t.description,
        inputSchema: (() => {
          if (!t.inputSchema) return null
          try {
            return JSON.parse(t.inputSchema)
          } catch {
            logger.warn("Invalid inputSchema JSON", { toolId: t.id })
            return null
          }
        })(),
        customDescription: t.customDescription,
        customPrompt: t.customPrompt,
        isEnabled: t.isEnabled === "true",
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })
    ),
  })
})

tools.patch("/:id", zValidator("json", updateToolSchema), async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()
  const updates = c.req.valid("json")
  const dbQuery = db().query

  const tool = await dbQuery.mcpTool.findFirst({
    where: eq(mcpTool.id, id),
  })

  if (!tool) {
    throw ApiError.notFound("Tool not found")
  }

  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, tool.serverId),
  })

  if (!server) {
    throw ApiError.notFound("Server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.customDescription !== undefined) {
    updateData.customDescription = updates.customDescription
  }
  if (updates.customPrompt !== undefined) {
    updateData.customPrompt = updates.customPrompt
  }
  if (updates.isEnabled !== undefined) {
    updateData.isEnabled = updates.isEnabled ? "true" : "false"
  }

  const [updated] = await db()
    .update(mcpTool)
    .set(updateData)
    .where(eq(mcpTool.id, id))
    .returning()

  return c.json({
    tool: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      customDescription: updated.customDescription,
      customPrompt: updated.customPrompt,
      isEnabled: updated.isEnabled === "true",
      updatedAt: updated.updatedAt,
    },
  })
})

export default tools
