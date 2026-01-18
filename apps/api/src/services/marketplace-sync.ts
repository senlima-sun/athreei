import { eq, and } from "drizzle-orm"
import { db } from "../lib/db-operations"
import {
  marketplace,
  plugin,
  pluginVersion,
  pluginComponent,
} from "@athreei/db"
import {
  generatePluginId,
  generatePluginVersionId,
  generatePluginComponentId,
} from "./id-generator"
import { pluginManifestSchema } from "@athreei/shared"
import type { z } from "zod"

export interface SyncResult {
  added: number
  updated: number
  removed: number
  errors: string[]
}

export interface MarketplaceFile {
  name: string
  description?: string
  plugins: PluginDefinition[]
}

export interface PluginDefinition {
  slug: string
  source: string
  path?: string
}

export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: {
    name: string
    email?: string
  }
  commands?: string | string[]
  agents?: string | string[]
  skills?: string | string[]
  hooks?: string | Record<string, unknown>
  mcpServers?: string | Record<string, unknown>
  lspServers?: string | Record<string, unknown>
}

export async function syncMarketplace(
  marketplaceId: string
): Promise<SyncResult> {
  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.id, marketplaceId),
  })

  if (!mkt) {
    throw new Error("Marketplace not found")
  }

  if (mkt.sourceType === "internal") {
    throw new Error(
      "Internal marketplaces cannot be synced from external source"
    )
  }

  if (mkt.sourceType === "github" && mkt.sourceRepo) {
    return syncFromGitHub(mkt)
  }

  if (mkt.sourceType === "url" && mkt.sourceUrl) {
    return syncFromUrl(mkt)
  }

  throw new Error("Invalid marketplace configuration for sync")
}

async function syncFromGitHub(
  mkt: typeof marketplace.$inferSelect
): Promise<SyncResult> {
  const result: SyncResult = {
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
  }

  try {
    const ref = mkt.sourceRef || "main"
    const marketplaceUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/.claude-plugin/marketplace.json`

    const response = await fetch(marketplaceUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch marketplace.json: ${response.status}`)
    }

    const marketplaceFile = (await response.json()) as MarketplaceFile

    const syncedPluginSlugs: string[] = []

    for (const pluginDef of marketplaceFile.plugins) {
      try {
        const pluginResult = await syncPluginFromGitHub(mkt, pluginDef, ref)
        syncedPluginSlugs.push(pluginDef.slug)

        if (pluginResult.isNew) {
          result.added++
        } else {
          result.updated++
        }
      } catch (error) {
        result.errors.push(
          `Failed to sync plugin ${pluginDef.slug}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    const existingPlugins = await db().query.plugin.findMany({
      where: eq(plugin.marketplaceId, mkt.id),
    })

    const removedPlugins = existingPlugins.filter(
      (p) => !syncedPluginSlugs.includes(p.slug)
    )

    for (const removedPlugin of removedPlugins) {
      await db().delete(plugin).where(eq(plugin.id, removedPlugin.id))
      result.removed++
    }

    await db()
      .update(marketplace)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplace.id, mkt.id))
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }

  return result
}

async function syncPluginFromGitHub(
  mkt: typeof marketplace.$inferSelect,
  pluginDef: PluginDefinition,
  ref: string
): Promise<{ isNew: boolean }> {
  let manifestUrl: string

  if (pluginDef.source.startsWith("github:")) {
    const [repo, path] = pluginDef.source.replace("github:", "").split("#")
    const manifestPath = path || "plugin.json"
    manifestUrl = `https://raw.githubusercontent.com/${repo}/${ref}/${manifestPath}`
  } else if (pluginDef.path) {
    manifestUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/${pluginDef.path}/plugin.json`
  } else {
    manifestUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/plugins/${pluginDef.slug}/plugin.json`
  }

  const response = await fetch(manifestUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch plugin manifest: ${response.status}`)
  }

  const rawManifest = await response.json()
  const manifestResult = pluginManifestSchema.safeParse(rawManifest)

  if (!manifestResult.success) {
    throw new Error(`Invalid manifest: ${manifestResult.error.message}`)
  }

  const manifest = manifestResult.data

  const existingPlugin = await db().query.plugin.findFirst({
    where: and(
      eq(plugin.marketplaceId, mkt.id),
      eq(plugin.slug, pluginDef.slug)
    ),
  })

  const now = new Date()
  let pluginId: string
  let isNew = false

  if (existingPlugin) {
    pluginId = existingPlugin.id

    await db()
      .update(plugin)
      .set({
        name: manifest.name,
        description: manifest.description || null,
        author: manifest.author?.name || null,
        updatedAt: now,
      })
      .where(eq(plugin.id, pluginId))
  } else {
    pluginId = generatePluginId()
    isNew = true

    await db()
      .insert(plugin)
      .values({
        id: pluginId,
        marketplaceId: mkt.id,
        slug: pluginDef.slug,
        name: manifest.name,
        description: manifest.description || null,
        author: manifest.author?.name || null,
        tags: "[]",
        downloadCount: "0",
        createdAt: now,
        updatedAt: now,
      })
  }

  const existingVersion = await db().query.pluginVersion.findFirst({
    where: and(
      eq(pluginVersion.pluginId, pluginId),
      eq(pluginVersion.version, manifest.version)
    ),
  })

  if (!existingVersion) {
    await db()
      .update(pluginVersion)
      .set({ isLatest: false })
      .where(eq(pluginVersion.pluginId, pluginId))

    const versionId = generatePluginVersionId()

    await db()
      .insert(pluginVersion)
      .values({
        id: versionId,
        pluginId,
        version: manifest.version,
        manifest: JSON.stringify(manifest),
        isLatest: true,
        publishedAt: now,
        createdAt: now,
      })

    await createComponentsFromManifest(versionId, manifest)
  }

  return { isNew }
}

async function createComponentsFromManifest(
  versionId: string,
  manifest: z.infer<typeof pluginManifestSchema>
): Promise<void> {
  const now = new Date()
  const components: Array<typeof pluginComponent.$inferInsert> = []

  if (manifest.mcpServers) {
    if (typeof manifest.mcpServers === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "mcp_server",
        name: "MCP Server",
        config: JSON.stringify({ path: manifest.mcpServers }),
        createdAt: now,
      })
    } else {
      for (const [name, config] of Object.entries(manifest.mcpServers)) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "mcp_server",
          name,
          config: JSON.stringify(config),
          createdAt: now,
        })
      }
    }
  }

  if (manifest.skills) {
    const skills = Array.isArray(manifest.skills)
      ? manifest.skills
      : [manifest.skills]
    for (const skill of skills) {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "skill",
        name: skill,
        config: JSON.stringify({ path: skill }),
        createdAt: now,
      })
    }
  }

  if (manifest.commands) {
    const commands = Array.isArray(manifest.commands)
      ? manifest.commands
      : [manifest.commands]
    for (const command of commands) {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "command",
        name: command,
        config: JSON.stringify({ path: command }),
        createdAt: now,
      })
    }
  }

  if (manifest.agents) {
    const agents = Array.isArray(manifest.agents)
      ? manifest.agents
      : [manifest.agents]
    for (const agent of agents) {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "agent",
        name: agent,
        config: JSON.stringify({ path: agent }),
        createdAt: now,
      })
    }
  }

  if (manifest.hooks) {
    if (typeof manifest.hooks === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "hook",
        name: "Hooks",
        config: JSON.stringify({ path: manifest.hooks }),
        createdAt: now,
      })
    } else {
      for (const [name, config] of Object.entries(manifest.hooks)) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "hook",
          name,
          config: JSON.stringify(config),
          createdAt: now,
        })
      }
    }
  }

  if (components.length > 0) {
    await db().insert(pluginComponent).values(components)
  }
}

async function syncFromUrl(
  mkt: typeof marketplace.$inferSelect
): Promise<SyncResult> {
  const result: SyncResult = {
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
  }

  try {
    const response = await fetch(mkt.sourceUrl!)
    if (!response.ok) {
      throw new Error(`Failed to fetch marketplace.json: ${response.status}`)
    }

    const marketplaceFile = (await response.json()) as MarketplaceFile

    for (const pluginDef of marketplaceFile.plugins) {
      result.errors.push(
        `URL sync for plugin ${pluginDef.slug} not implemented yet`
      )
    }

    await db()
      .update(marketplace)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplace.id, mkt.id))
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }

  return result
}
