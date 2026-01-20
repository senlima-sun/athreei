/**
 * Registry to Marketplace Transformer
 *
 * Transforms legacy MCP registry JSON entries into the marketplace
 * plugin + version + component structure.
 */

import type { InferInsertModel } from "drizzle-orm"
import type { plugin as pgPlugin } from "../schema/pg/marketplaces"
import type { pluginVersion as pgPluginVersion } from "../schema/pg/marketplaces"
import type { pluginComponent as pgPluginComponent } from "../schema/pg/marketplaces"
import { SYSTEM_MARKETPLACE_ID } from "./system-marketplace"

export type PluginInsert = InferInsertModel<typeof pgPlugin>
export type PluginVersionInsert = InferInsertModel<typeof pgPluginVersion>
export type PluginComponentInsert = InferInsertModel<typeof pgPluginComponent>

export interface RegistryEnvVar {
  name: string
  description: string
  required: boolean
}

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
  envVars?: RegistryEnvVar[]
  categories: string[]
  verified: boolean
}

export interface TransformedPlugin {
  plugin: PluginInsert
  version: PluginVersionInsert
  component: PluginComponentInsert
}

export function transformRegistryServer(
  server: RegistryServer,
  idGenerator: () => string = () => crypto.randomUUID()
): TransformedPlugin {
  const now = new Date()
  const pluginId = idGenerator()
  const versionId = idGenerator()
  const componentId = idGenerator()

  const plugin: PluginInsert = {
    id: pluginId,
    marketplaceId: SYSTEM_MARKETPLACE_ID,
    slug: server.slug,
    name: server.name,
    description: server.description,
    category: server.categories[0] || "utilities",
    tags: JSON.stringify(server.categories.slice(1)),
    author: server.publisher,
    homepage: server.docsUrl || null,
    repository: server.docsUrl || null,
    license: null,
    iconUrl: server.iconUrl || null,
    isVerified: server.verified,
    isFeatured: server.verified,
    downloadCount: "0",
    createdAt: now,
    updatedAt: now,
  }

  const manifest = {
    name: server.name,
    version: "1.0.0",
    description: server.description,
    author: { name: server.publisher },
    mcpServers: {
      [server.slug]: {
        transport: server.transport,
        command: server.command,
        args: server.args,
        url: server.url,
        envVars: server.envVars,
      },
    },
  }

  const version: PluginVersionInsert = {
    id: versionId,
    pluginId,
    version: "1.0.0",
    changelog: "Initial release migrated from MCP registry",
    manifest: JSON.stringify(manifest),
    sourceHash: null,
    isLatest: true,
    publishedAt: now,
    createdAt: now,
  }

  const componentConfig = {
    transport: server.transport,
    command: server.command,
    args: server.args,
    url: server.url,
    envVars: server.envVars,
  }

  const component: PluginComponentInsert = {
    id: componentId,
    pluginVersionId: versionId,
    type: "mcp_server",
    name: server.name,
    description: server.description,
    config: JSON.stringify(componentConfig),
    createdAt: now,
  }

  return { plugin, version, component }
}

export function transformRegistryServers(
  servers: RegistryServer[],
  idGenerator: () => string = () => crypto.randomUUID()
): TransformedPlugin[] {
  return servers.map((server) => transformRegistryServer(server, idGenerator))
}

export interface RegistryJson {
  $schema?: string
  version: string
  lastUpdated: string
  servers: RegistryServer[]
}

export function parseRegistryJson(json: string): RegistryJson {
  const data = JSON.parse(json) as RegistryJson
  if (!data.servers || !Array.isArray(data.servers)) {
    throw new Error("Invalid registry JSON: missing servers array")
  }
  return data
}
