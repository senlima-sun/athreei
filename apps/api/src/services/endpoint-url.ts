/**
 * Endpoint URL Builder service
 *
 * Utilities for building MCP endpoint URLs and connection configurations.
 */

/**
 * Default public URL for athreei endpoints
 */
const DEFAULT_PUBLIC_URL = "https://athreei.com"

/**
 * Build the public MCP URL for an endpoint.
 *
 * Uses the PUBLIC_URL environment variable if set, otherwise defaults
 * to the production athreei.com URL.
 *
 * @param slug - The endpoint slug (URL-safe identifier)
 * @returns The full SSE endpoint URL
 *
 * @example
 * ```typescript
 * buildEndpointUrl("my-tools")
 * // "https://athreei.com/mcp/my-tools/sse"
 *
 * // With PUBLIC_URL=http://localhost:3000
 * buildEndpointUrl("dev-server")
 * // "http://localhost:3000/mcp/dev-server/sse"
 * ```
 */
export function buildEndpointUrl(slug: string): string {
  const baseUrl = process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL
  return `${baseUrl}/mcp/${slug}/sse`
}

/**
 * Extract the slug from an endpoint URL.
 *
 * Parses URLs in the format: {baseUrl}/mcp/{slug}/sse
 *
 * @param url - The full endpoint URL
 * @returns The slug portion, or null if URL format is invalid
 *
 * @example
 * ```typescript
 * extractSlugFromUrl("https://athreei.com/mcp/my-tools/sse")
 * // "my-tools"
 *
 * extractSlugFromUrl("invalid-url")
 * // null
 * ```
 */
export function extractSlugFromUrl(url: string): string | null {
  const parts = url.split("/")
  const mcpIndex = parts.indexOf("mcp")
  return mcpIndex !== -1 ? (parts[mcpIndex + 1] ?? null) : null
}

/**
 * Connection configuration for Claude Desktop
 */
export interface ClaudeDesktopConfig {
  mcpServers: {
    [name: string]: {
      url: string
      transport: "sse"
    }
  }
}

/**
 * Generic connection configuration
 */
export interface GenericConnectionConfig {
  url: string
  transport: "sse"
}

/**
 * Full connection configuration object
 */
export interface ConnectionConfig {
  claudeDesktop: ClaudeDesktopConfig
  generic: GenericConnectionConfig
}

/**
 * Build connection configuration for AI apps.
 *
 * Returns configuration in multiple formats:
 * - claudeDesktop: Format for Claude Desktop's config.json
 * - generic: Standard format for other MCP clients
 *
 * @param endpointName - Human-readable name for the endpoint
 * @param endpointUrl - The full SSE endpoint URL
 * @returns Configuration object with multiple formats
 *
 * @example
 * ```typescript
 * const config = buildConnectionConfig("My Tools", "https://athreei.com/mcp/my-tools/sse")
 * // {
 * //   claudeDesktop: {
 * //     mcpServers: {
 * //       "My Tools": {
 * //         url: "https://athreei.com/mcp/my-tools/sse",
 * //         transport: "sse"
 * //       }
 * //     }
 * //   },
 * //   generic: {
 * //     url: "https://athreei.com/mcp/my-tools/sse",
 * //     transport: "sse"
 * //   }
 * // }
 * ```
 */
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

/**
 * Generate a config version string based on namespace and server data.
 *
 * Used for cache invalidation and change detection.
 * Format: "{latestUpdateTimestamp}-{serverCount}"
 *
 * @param namespaceUpdatedAt - Namespace's last update timestamp
 * @param servers - Array of servers with updatedAt timestamps
 * @returns A version string like "1704067200000-3"
 *
 * @example
 * ```typescript
 * const version = generateConfigVersion(
 *   namespace.updatedAt,
 *   servers.map(s => ({ updatedAt: s.updatedAt }))
 * )
 * // "1704067200000-5"
 * ```
 */
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

/**
 * Validate that an endpoint URL matches the expected format.
 *
 * @param url - The URL to validate
 * @returns true if the URL follows the /mcp/{slug}/sse pattern
 */
export function isValidEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/^\/mcp\/[a-z0-9-]+\/sse$/)
    return pathMatch !== null
  } catch {
    return false
  }
}
