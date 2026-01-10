import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { mcpServer, mcpTool } from "@athreei/db"
import { decryptEnv, isEncryptionConfigured } from "../../lib/encryption"
import { verifyOrganizationMembership, generateUUID } from "../../services"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { UpdateToolInput } from "../../schemas/mcp-servers"

function now(): Date {
  return new Date()
}

export async function listTools(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  const server = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  const tools = await db().query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  return c.json({
    data: tools,
    total: tools.length,
  })
}

export async function refreshTools(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  const server = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  if (server.transport !== "sse" || !server.url) {
    throw ApiError.badRequest(
      `Tool refresh not supported for ${server.transport} transport`
    )
  }

  const client = new Client(
    {
      name: "athreei-tool-refresh",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport: SSEClientTransport | null = null

  try {
    let authHeaders: Record<string, string> = {}
    if (server.encryptedEnv && isEncryptionConfigured()) {
      try {
        const env = decryptEnv(server.encryptedEnv)
        if (env.AUTH_TOKEN || env.AUTHORIZATION) {
          authHeaders = {
            Authorization: `Bearer ${env.AUTH_TOKEN || env.AUTHORIZATION}`,
          }
        }
      } catch {
        // Continue without auth if decryption fails
      }
    }

    transport = new SSEClientTransport(new URL(server.url), {
      requestInit: {
        headers: authHeaders,
      },
    })

    const connectPromise = client.connect(transport)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout after 10 seconds")),
        10_000
      )
    })

    await Promise.race([connectPromise, timeoutPromise])

    const listToolsPromise = client.listTools()
    const listToolsTimeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("List tools timeout after 10 seconds")),
        10_000
      )
    })

    const toolsResponse = await Promise.race([
      listToolsPromise,
      listToolsTimeout,
    ])
    const fetchedTools = toolsResponse.tools || []

    await client.close()

    const existingTools = await db().query.mcpTool.findMany({
      where: eq(mcpTool.serverId, serverId),
    })

    const existingOverrides = new Map<
      string,
      {
        customDescription: string | null
        customPrompt: string | null
        isEnabled: string
      }
    >()
    for (const tool of existingTools) {
      existingOverrides.set(tool.name, {
        customDescription: tool.customDescription,
        customPrompt: tool.customPrompt,
        isEnabled: tool.isEnabled,
      })
    }

    await db().delete(mcpTool).where(eq(mcpTool.serverId, serverId))

    const timestamp = now()
    const newTools = fetchedTools.map(
      (tool: { name: string; description?: string; inputSchema?: unknown }) => {
        const override = existingOverrides.get(tool.name)
        return {
          id: generateUUID(),
          serverId,
          name: tool.name,
          description: tool.description ?? null,
          inputSchema: tool.inputSchema
            ? JSON.stringify(tool.inputSchema)
            : null,
          customDescription: override?.customDescription ?? null,
          customPrompt: override?.customPrompt ?? null,
          isEnabled: override?.isEnabled ?? "true",
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      }
    )

    if (newTools.length > 0) {
      await db().insert(mcpTool).values(newTools)
    }

    await db()
      .update(mcpServer)
      .set({ lastSeenAt: timestamp, updatedAt: timestamp })
      .where(eq(mcpServer.id, serverId))

    return c.json({
      message: "Tools refreshed successfully",
      tools: newTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        customDescription: t.customDescription,
        isEnabled: t.isEnabled === "true",
      })),
      total: newTools.length,
    })
  } catch (error) {
    try {
      await client.close()
    } catch {
      // Ignore close errors
    }

    const errorMessage = error instanceof Error ? error.message : String(error)

    let friendlyError = errorMessage
    if (errorMessage.includes("timeout")) {
      friendlyError =
        "Connection timeout. The server may be unreachable or slow to respond."
    } else if (
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized")
    ) {
      friendlyError = "Authentication failed. Please check your auth token."
    } else if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      friendlyError =
        "Could not connect to server. Please verify the URL and server status."
    }

    throw ApiError.badRequest(`Failed to refresh tools: ${friendlyError}`)
  }
}

export async function updateTool(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")
  const toolName = c.req.param("toolName")
  const updates = (
    c.req as unknown as { valid: (target: "json") => UpdateToolInput }
  ).valid("json")

  const server = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  const tool = await db().query.mcpTool.findFirst({
    where: and(eq(mcpTool.serverId, serverId), eq(mcpTool.name, toolName)),
  })

  if (!tool) {
    throw ApiError.notFound(`Tool '${toolName}' not found on this server`)
  }

  const updateData: Record<string, unknown> = {
    updatedAt: now(),
  }

  if (updates.description !== undefined) {
    updateData.customDescription = updates.description
  }

  if (updates.enabled !== undefined) {
    updateData.isEnabled = updates.enabled ? "true" : "false"
  }

  await db().update(mcpTool).set(updateData).where(eq(mcpTool.id, tool.id))

  const updated = await db().query.mcpTool.findFirst({
    where: eq(mcpTool.id, tool.id),
  })

  if (!updated) {
    throw ApiError.notFound("Tool not found after update")
  }

  return c.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    customDescription: updated.customDescription,
    inputSchema: updated.inputSchema ? JSON.parse(updated.inputSchema) : null,
    isEnabled: updated.isEnabled === "true",
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}
