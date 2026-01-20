/**
 * Registry Compatibility Layer
 *
 * Transforms marketplace plugin responses to the legacy registry format
 * for backwards compatibility during migration.
 */

import type { PluginSearchResult, PluginDetails } from "./plugin-discovery"

export interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  docsUrl?: string
  envVars?: Array<{
    name: string
    description: string
    required: boolean
  }>
  categories: string[]
  verified: boolean
}

export interface RegistryResponse {
  servers: RegistryServer[]
  total: number
  categories: string[]
}

function extractTransportFromConfig(config: unknown): "stdio" | "sse" {
  if (typeof config === "object" && config !== null) {
    const c = config as Record<string, unknown>
    if (c.transport === "sse") return "sse"
  }
  return "stdio"
}

function extractMcpConfig(config: unknown): {
  command?: string
  args?: string[]
  url?: string
  envVars?: Array<{ name: string; description: string; required: boolean }>
} {
  if (typeof config !== "object" || config === null) {
    return {}
  }

  const c = config as Record<string, unknown>
  return {
    command: typeof c.command === "string" ? c.command : undefined,
    args: Array.isArray(c.args) ? (c.args as string[]) : undefined,
    url: typeof c.url === "string" ? c.url : undefined,
    envVars: Array.isArray(c.envVars)
      ? (c.envVars as Array<{
          name: string
          description: string
          required: boolean
        }>)
      : undefined,
  }
}

export function pluginToRegistryServer(
  searchResult: PluginSearchResult,
  componentConfig?: unknown
): RegistryServer {
  const mcpConfig = extractMcpConfig(componentConfig)

  return {
    slug: searchResult.slug,
    name: searchResult.name,
    description: searchResult.description || "",
    publisher: searchResult.author || "Unknown",
    iconUrl: searchResult.iconUrl || undefined,
    transport: extractTransportFromConfig(componentConfig),
    command: mcpConfig.command,
    args: mcpConfig.args,
    url: mcpConfig.url,
    docsUrl:
      typeof searchResult.marketplace === "object" ? undefined : undefined,
    envVars: mcpConfig.envVars,
    categories: [searchResult.category || "utilities", ...searchResult.tags],
    verified: searchResult.isVerified,
  }
}

export function pluginDetailsToRegistryServer(
  details: PluginDetails
): RegistryServer {
  return {
    slug: details.slug,
    name: details.name,
    description: details.description || "",
    publisher: details.author || "Unknown",
    iconUrl: details.iconUrl || undefined,
    transport: "stdio",
    docsUrl: details.homepage || undefined,
    categories: [details.category || "utilities", ...details.tags],
    verified: details.isVerified,
  }
}

export function extractCategoriesFromPlugins(
  plugins: PluginSearchResult[]
): string[] {
  const categorySet = new Set<string>()

  for (const p of plugins) {
    if (p.category) {
      categorySet.add(p.category)
    }
    for (const tag of p.tags) {
      categorySet.add(tag)
    }
  }

  return Array.from(categorySet).sort()
}
