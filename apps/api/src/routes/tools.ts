/**
 * Tools routes
 *
 * API endpoints for managing MCP tool configurations.
 * Enables users to customize tool descriptions and prompts for AI apps.
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { mcpTool, mcpServer, member } from "@athreei/db"

const tools = new Hono()

// Apply auth middleware to all tool routes
tools.use("*", authMiddleware)

// =============================================================================
// Validation Schemas
// =============================================================================

const listToolsQuerySchema = z.object({
  serverId: z.string().min(1, "serverId is required"),
})

const updateToolSchema = z.object({
  customDescription: z.string().max(2000).nullable().optional(),
  customPrompt: z.string().max(5000).nullable().optional(),
  isEnabled: z.boolean().optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user is a member of the organization
 */
async function verifyOrganizationMembership(
  db: DatabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).query.member.findFirst({
    where: and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
  })
  return !!membership
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/tools?serverId={id}
 * List all tools for an MCP server
 */
tools.get("/", zValidator("query", listToolsQuerySchema), async (c) => {
  const auth = getAuthContext(c)
  const { serverId } = c.req.valid("query")
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Get the server to check organization
  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("Server not found")
  }

  // Verify user has access
  const isMember = await verifyOrganizationMembership(db, auth.userId, server.organizationId)

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  // Get tools
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
        inputSchema: t.inputSchema ? JSON.parse(t.inputSchema) : null,
        customDescription: t.customDescription,
        customPrompt: t.customPrompt,
        isEnabled: t.isEnabled === "true",
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })
    ),
  })
})

/**
 * PATCH /api/tools/:id
 * Update tool custom configuration
 */
tools.patch("/:id", zValidator("json", updateToolSchema), async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()
  const updates = c.req.valid("json")
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Get the tool
  const tool = await dbQuery.mcpTool.findFirst({
    where: eq(mcpTool.id, id),
  })

  if (!tool) {
    throw ApiError.notFound("Tool not found")
  }

  // Get the server to check organization
  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, tool.serverId),
  })

  if (!server) {
    throw ApiError.notFound("Server not found")
  }

  // Verify user has access
  const isMember = await verifyOrganizationMembership(db, auth.userId, server.organizationId)

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  // Build update object
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

  // Update the tool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await (db as any)
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
