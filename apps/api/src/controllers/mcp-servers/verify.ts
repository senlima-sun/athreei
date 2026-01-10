import type { Context } from "hono"
import { getAuthContext } from "../../middleware"
import { checkRateLimit } from "../../middleware/rate-limit"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { VerifyMcpServerInput } from "../../schemas/mcp-servers"

const VERIFY_RATE_LIMIT = 20
const VERIFY_RATE_WINDOW_MS = 60_000
const VERIFY_TIMEOUT_MS = 10_000

export async function verifyServer(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const { serverUrl, authToken } = (
    c.req as unknown as { valid: (target: "json") => VerifyMcpServerInput }
  ).valid("json")

  const rateLimitKey = `verify:${auth.userId}`
  const rateLimitInfo = checkRateLimit(
    rateLimitKey,
    VERIFY_RATE_LIMIT,
    VERIFY_RATE_WINDOW_MS
  )

  c.header("X-RateLimit-Limit", String(VERIFY_RATE_LIMIT))
  c.header(
    "X-RateLimit-Remaining",
    String(Math.max(0, VERIFY_RATE_LIMIT - rateLimitInfo.current))
  )
  c.header(
    "X-RateLimit-Reset",
    String(Math.ceil((Date.now() + rateLimitInfo.resetIn) / 1000))
  )

  if (rateLimitInfo.limited) {
    c.header("Retry-After", String(Math.ceil(rateLimitInfo.resetIn / 1000)))
    return c.json(
      {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitInfo.resetIn / 1000)} seconds.`,
      },
      429
    )
  }

  const client = new Client(
    {
      name: "athreei-verify",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport: SSEClientTransport | null = null

  try {
    transport = new SSEClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    })

    const connectPromise = client.connect(transport)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout after 10 seconds")),
        VERIFY_TIMEOUT_MS
      )
    })

    await Promise.race([connectPromise, timeoutPromise])

    const listToolsPromise = client.listTools()
    const listToolsTimeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Listing tools timeout after 10 seconds")),
        VERIFY_TIMEOUT_MS
      )
    })

    const toolsResponse = await Promise.race([
      listToolsPromise,
      listToolsTimeout,
    ])
    const tools = toolsResponse.tools || []

    const toolNames = tools.map((tool: { name: string }) => tool.name)

    await client.close()

    return c.json({
      success: true,
      tools: toolNames,
      toolCount: toolNames.length,
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
      friendlyError =
        "Authentication failed. Please check your auth token is correct."
    } else if (
      errorMessage.includes("403") ||
      errorMessage.includes("Forbidden")
    ) {
      friendlyError =
        "Access denied. Your auth token may not have the required permissions."
    } else if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      friendlyError =
        "Could not connect to server. Please verify the URL is correct and the server is running."
    } else if (errorMessage.includes("Invalid URL")) {
      friendlyError = "Invalid server URL format."
    }

    return c.json({
      success: false,
      error: friendlyError,
    })
  }
}
