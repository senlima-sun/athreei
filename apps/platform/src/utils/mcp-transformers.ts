/**
 * MCP server data transformation utilities
 */
import type {
  ApiMcpServer,
  McpServer,
  McpServerFormData,
  TransportType,
  ServerStatus,
} from "@/types"

/**
 * Convert API transport type to frontend transport type.
 * Maps "streamable-http" to "http" for UI display.
 */
function mapTransportType(
  apiTransport: ApiMcpServer["transport"]
): TransportType {
  return apiTransport === "streamable-http" ? "http" : apiTransport
}

/**
 * Convert API status to frontend status.
 * Maps "pending" to "inactive" for UI display.
 */
function mapServerStatus(apiStatus: ApiMcpServer["status"]): ServerStatus {
  return apiStatus === "pending" ? "inactive" : apiStatus
}

function safeParseArgs(args: string | null | undefined): string[] | undefined {
  if (!args) return undefined

  try {
    const parsed = JSON.parse(args)
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed
    }
    console.warn("MCP server args is not a valid string array:", args)
    return undefined
  } catch {
    console.warn("Failed to parse MCP server args:", args)
    return undefined
  }
}

/**
 * Transform API response format to frontend display format.
 */
export function toFrontendFormat(server: ApiMcpServer): McpServer {
  return {
    id: server.id,
    name: server.name,
    description: server.description || undefined,
    transportType: mapTransportType(server.transport),
    status: mapServerStatus(server.status),
    command: server.command || undefined,
    args: safeParseArgs(server.args),
    url: server.url || undefined,
    envKeys: server.envKeys,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
  }
}

/**
 * Transform form data to API request format.
 */
export function toApiFormat(data: McpServerFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    transport:
      data.transportType === "http" ? "streamable-http" : data.transportType,
    status: data.status,
    command: data.command || undefined,
    args: data.args?.length ? JSON.stringify(data.args) : undefined,
    url: data.url || undefined,
    ...(data.env ? { env: data.env } : {}),
  }
}
