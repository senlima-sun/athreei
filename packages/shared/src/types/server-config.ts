/**
 * Server Configuration Types
 *
 * Defines the MCP server configuration schema used by both CLI and gateway.
 * Supports three transport types: stdio, SSE, and streamable-http.
 */

import { z } from "zod"

// ============================================================================
// Transport Types
// ============================================================================

/**
 * Supported MCP transport protocols
 */
export type ServerTransport = "stdio" | "sse" | "streamable-http"

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * MCP server configuration
 *
 * @example stdio transport
 * ```json
 * {
 *   "name": "filesystem",
 *   "transport": "stdio",
 *   "command": "npx",
 *   "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
 * }
 * ```
 *
 * @example SSE transport
 * ```json
 * {
 *   "name": "github",
 *   "transport": "sse",
 *   "url": "http://localhost:8000/sse",
 *   "headers": { "Authorization": "Bearer token" }
 * }
 * ```
 */
export interface ServerConfig {
  /** Unique name for this server */
  name: string

  /** Transport protocol (defaults to "stdio" if not specified) */
  transport?: ServerTransport

  // stdio transport fields
  /** Command to execute (required for stdio) */
  command?: string
  /** Command arguments (for stdio) */
  args?: string[]
  /** Environment variables for the process (for stdio) */
  env?: Record<string, string>

  // HTTP-based transport fields (SSE, streamable-http)
  /** Server URL (required for sse/streamable-http) */
  url?: string
  /** HTTP headers to send with requests */
  headers?: Record<string, string>

  /** Optional token for authentication (may be encrypted) */
  token?: string
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Zod schema for server transport type
 */
export const serverTransportSchema = z.enum(["stdio", "sse", "streamable-http"])

/**
 * Zod schema for server configuration
 *
 * Validates that:
 * - name is required and non-empty
 * - stdio transport requires command
 * - sse/streamable-http transport requires url
 */
export const serverConfigSchema = z
  .object({
    name: z.string().min(1, "Server name is required"),
    transport: serverTransportSchema.optional().default("stdio"),

    // stdio fields
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),

    // HTTP transport fields
    url: z.string().url().optional(),
    headers: z.record(z.string()).optional(),

    // Common fields
    token: z.string().optional(),
  })
  .refine(
    (data) => {
      const transport = data.transport ?? "stdio"

      if (transport === "stdio") {
        return typeof data.command === "string" && data.command.length > 0
      }

      // SSE or streamable-http requires URL
      return typeof data.url === "string" && data.url.length > 0
    },
    (data) => {
      const transport = data.transport ?? "stdio"
      if (transport === "stdio") {
        return {
          message: "Command is required for stdio transport",
          path: ["command"],
        }
      }
      return {
        message: `URL is required for ${transport} transport`,
        path: ["url"],
      }
    }
  )

/**
 * Validated server configuration type (inferred from schema)
 */
export type ValidatedServerConfig = z.infer<typeof serverConfigSchema>

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if server uses stdio transport
 */
export function isStdioServer(
  server: ServerConfig
): server is ServerConfig & { command: string } {
  return (server.transport ?? "stdio") === "stdio" && !!server.command
}

/**
 * Check if server uses HTTP-based transport (SSE or streamable-http)
 */
export function isHttpServer(
  server: ServerConfig
): server is ServerConfig & { url: string } {
  const transport = server.transport ?? "stdio"
  return (
    (transport === "sse" || transport === "streamable-http") && !!server.url
  )
}

// ============================================================================
// Verification Result
// ============================================================================

/**
 * Result of verifying an MCP server connection
 */
export interface ServerVerifyResult {
  /** Server name */
  name: string
  /** Server URL or command */
  target: string
  /** Whether verification succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** List of available tools if successful */
  tools?: string[]
  /** Server info from initialize response */
  serverInfo?: {
    name: string
    version: string
  }
}
