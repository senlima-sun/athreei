import { Client } from "@modelcontextprotocol/sdk/client"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
  isStdioServer,
  isHttpServer,
  type ServerConfig,
  type ServerVerifyResult,
} from "@athreei/shared"
import { DEFAULT_MCP_TIMEOUT, CLIENT_INFO } from "../constants/index"

export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpClientOptions {
  timeout?: number
}

export async function verifyMcpServer(
  config: ServerConfig,
  options?: McpClientOptions
): Promise<ServerVerifyResult> {
  const timeout = options?.timeout ?? DEFAULT_MCP_TIMEOUT
  const target = isStdioServer(config)
    ? config.command
    : isHttpServer(config)
      ? config.url
      : "unknown"

  const result: ServerVerifyResult = {
    name: config.name,
    target,
    success: false,
  }

  try {
    const client = new Client(CLIENT_INFO, {
      capabilities: {},
    })

    const transport = createTransport(config)

    await withTimeout(client.connect(transport), timeout, "Connection timeout")

    try {
      const serverInfo = client.getServerVersion()
      if (serverInfo) {
        result.serverInfo = {
          name: serverInfo.name,
          version: serverInfo.version,
        }
      }
    } catch {
      // Server info is optional
    }

    const toolsResponse = await withTimeout(
      client.listTools(),
      timeout,
      "Tools list timeout"
    )
    const tools = toolsResponse.tools ?? []

    result.success = true
    result.tools = tools.map((t) => t.name)

    await client.close()
  } catch (error) {
    result.success = false
    result.error = error instanceof Error ? error.message : String(error)
  }

  return result
}

export async function verifyMcpServers(
  configs: ServerConfig[],
  options?: McpClientOptions
): Promise<ServerVerifyResult[]> {
  return Promise.all(configs.map((config) => verifyMcpServer(config, options)))
}

export async function listMcpTools(
  config: ServerConfig,
  options?: McpClientOptions
): Promise<McpTool[]> {
  const timeout = options?.timeout ?? DEFAULT_MCP_TIMEOUT

  const client = new Client(CLIENT_INFO, {
    capabilities: {},
  })

  const transport = createTransport(config)

  try {
    await withTimeout(client.connect(transport), timeout, "Connection timeout")

    const response = await withTimeout(
      client.listTools(),
      timeout,
      "Tools list timeout"
    )

    await client.close()

    return (response.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }))
  } catch (error) {
    await client.close().catch(() => {})
    throw error
  }
}

function createTransport(config: ServerConfig) {
  if (isStdioServer(config)) {
    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    })
  }

  if (isHttpServer(config)) {
    const url = new URL(config.url)
    const headers: Record<string, string> = {
      ...config.headers,
    }

    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`
    }

    return new SSEClientTransport(url, {
      eventSourceInit: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              ...headers,
            },
          }),
      },
      requestInit: {
        headers,
      },
    })
  }

  throw new Error(`Unsupported transport: ${config.transport ?? "stdio"}`)
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  )
  return Promise.race([promise, timeoutPromise])
}
