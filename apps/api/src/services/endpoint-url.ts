const DEFAULT_PUBLIC_URL = "https://athreei.com"

export function buildEndpointUrl(slug: string): string {
  const baseUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL
  return `${baseUrl}/mcp/${slug}/sse`
}

export function extractSlugFromUrl(url: string): string | null {
  const parts = url.split("/")
  const mcpIndex = parts.indexOf("mcp")
  return mcpIndex !== -1 ? (parts[mcpIndex + 1] ?? null) : null
}

export interface ClaudeDesktopConfig {
  mcpServers: {
    [name: string]: {
      url: string
      transport: "sse"
    }
  }
}

export interface GenericConnectionConfig {
  url: string
  transport: "sse"
}

export interface ConnectionConfig {
  claudeDesktop: ClaudeDesktopConfig
  generic: GenericConnectionConfig
}

export function buildConnectionConfig(
  endpointName: string,
  endpointUrl: string
): ConnectionConfig {
  return {
    claudeDesktop: {
      mcpServers: {
        [endpointName]: {
          url: endpointUrl,
          transport: "sse",
        },
      },
    },
    generic: {
      url: endpointUrl,
      transport: "sse",
    },
  }
}

export function generateConfigVersion(
  namespaceUpdatedAt: Date | string,
  servers: Array<{ updatedAt: Date | string }>
): string {
  const namespaceTime = new Date(namespaceUpdatedAt).getTime()

  const latestServerUpdate = servers.reduce((latest, s) => {
    const updated = new Date(s.updatedAt).getTime()
    return updated > latest ? updated : latest
  }, namespaceTime)

  return `${latestServerUpdate}-${servers.length}`
}

export function isValidEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/^\/mcp\/[a-z0-9-]+\/sse$/)
    return pathMatch !== null
  } catch {
    return false
  }
}
