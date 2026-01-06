/**
 * MCP connection verification for CLI
 * Connects to MCP servers to verify they are accessible
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { VerifyResult, ServerConfig } from "../types.js"
import { decryptToken } from "./crypto.js"

const CONNECTION_TIMEOUT = 10000 // 10 seconds

/**
 * Verify connection to a single MCP server
 */
export async function verifyServer(
  server: ServerConfig
): Promise<VerifyResult> {
  const result: VerifyResult = {
    name: server.name,
    url: server.url,
    success: false,
  }

  try {
    // Create MCP client
    const client = new Client(
      {
        name: "a3i-cli",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    )

    // Decrypt token if needed
    const token = decryptToken(server.token)

    // Create SSE transport with auth header
    const url = new URL(server.url)
    const transport = new SSEClientTransport(url, {
      eventSourceInit: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              Authorization: `Bearer ${token}`,
            },
          }),
      },
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Connect with timeout
    const connectPromise = client.connect(transport)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Connection timeout")),
        CONNECTION_TIMEOUT
      )
    )

    await Promise.race([connectPromise, timeoutPromise])

    // List tools to verify server is responding
    const toolsResponse = await client.listTools()
    const tools = toolsResponse.tools || []

    result.success = true
    result.tools = tools.map((t) => t.name)

    // Disconnect
    await client.close()
  } catch (error) {
    result.success = false
    result.error = error instanceof Error ? error.message : String(error)
  }

  return result
}

/**
 * Verify connection to multiple MCP servers
 */
export async function verifyServers(
  servers: ServerConfig[]
): Promise<VerifyResult[]> {
  return Promise.all(servers.map((server) => verifyServer(server)))
}
