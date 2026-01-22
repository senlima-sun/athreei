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
import {
  pluginManifestSchema,
  createLogger,
  validateClaudeCodePlugin,
  type ClaudeCodePluginValidationResult,
} from "@athreei/shared"
import { z } from "zod"

const logger = createLogger({
  service: "marketplace-sync",
  pretty: process.env.NODE_ENV !== "production",
})

const pluginDefinitionSchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  source: z.string().optional(),
  manifestUrl: z.string().url().optional(),
  path: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z
    .union([
      z.string(),
      z.object({
        name: z.string(),
        email: z.string().optional(),
      }),
    ])
    .optional(),
  category: z.string().optional(),
})

const marketplaceFileSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  owner: z
    .object({
      name: z.string(),
      email: z.string().optional(),
    })
    .optional(),
  plugins: z.array(pluginDefinitionSchema),
})

const FETCH_TIMEOUT_MS = 30000

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface SyncResult {
  added: number
  updated: number
  removed: number
  errors: string[]
}

export type MarketplaceFile = z.infer<typeof marketplaceFileSchema>
export type PluginDefinition = z.infer<typeof pluginDefinitionSchema>

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
  skills?: string | string[] | Record<string, SkillInlineConfig>
  rules?: string | string[] | Record<string, RuleInlineConfig>
  hooks?: string | Record<string, HookInlineConfig>
  mcpServers?: string | Record<string, unknown>
  lspServers?: string | Record<string, unknown>
}

interface SkillInlineConfig {
  name: string
  description?: string
  content: string
  tags?: string[]
  allowedTools?: string[]
  triggerPatterns?: string[]
}

interface RuleInlineConfig {
  name: string
  description?: string
  content: string
  priority?: number
  scope?: "global" | "namespace" | "endpoint"
}

interface HookInlineConfig {
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "Stop"
  toolNamePattern?: string
  handler:
    | { type: "skill"; skillRef: string }
    | { type: "script"; command: string; args?: string[] }
    | { type: "rule"; action: "block" | "allow" | "ask"; message?: string }
  priority?: number
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

    const response = await fetchWithTimeout(marketplaceUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch marketplace.json: ${response.status}`)
    }

    const rawData = await response.json()
    const parseResult = marketplaceFileSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new Error(`Invalid marketplace.json: ${parseResult.error.message}`)
    }
    const marketplaceFile = parseResult.data

    const remotePluginSlugs = marketplaceFile.plugins.map(
      (p) => p.slug || p.name
    )

    for (const pluginDef of marketplaceFile.plugins) {
      const pluginSlug = pluginDef.slug || pluginDef.name
      if (!pluginSlug) {
        result.errors.push("Plugin missing both slug and name fields")
        continue
      }
      try {
        const pluginResult = await syncPluginFromGitHub(
          mkt,
          pluginDef,
          ref,
          pluginSlug
        )

        if (pluginResult.isNew) {
          result.added++
        } else {
          result.updated++
        }
      } catch (error) {
        result.errors.push(
          `Failed to sync plugin ${pluginSlug}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    const existingPlugins = await db().query.plugin.findMany({
      where: eq(plugin.marketplaceId, mkt.id),
    })

    const removedPlugins = existingPlugins.filter(
      (p) => !remotePluginSlugs.includes(p.slug)
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
  ref: string,
  pluginSlug: string
): Promise<{ isNew: boolean }> {
  let manifestUrl: string

  if (pluginDef.source?.startsWith("github:")) {
    const [repo, path] = pluginDef.source.replace("github:", "").split("#")
    const manifestPath = path || "plugin.json"
    manifestUrl = `https://raw.githubusercontent.com/${repo}/${ref}/${manifestPath}`
  } else if (pluginDef.source?.startsWith("./")) {
    const relativePath = pluginDef.source.slice(2)
    manifestUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/${relativePath}/.claude-plugin/plugin.json`
  } else if (pluginDef.path) {
    manifestUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/${pluginDef.path}/.claude-plugin/plugin.json`
  } else {
    manifestUrl = `https://raw.githubusercontent.com/${mkt.sourceRepo}/${ref}/plugins/${pluginSlug}/.claude-plugin/plugin.json`
  }

  const response = await fetchWithSecurityCheck(manifestUrl)
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
    where: and(eq(plugin.marketplaceId, mkt.id), eq(plugin.slug, pluginSlug)),
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
        slug: pluginSlug,
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
    const versionId = generatePluginVersionId()
    const validationResult = validateClaudeCodePlugin(rawManifest)
    const validationStatus = getValidationStatus(validationResult)

    await db().transaction(async (tx) => {
      await tx
        .update(pluginVersion)
        .set({ isLatest: false })
        .where(eq(pluginVersion.pluginId, pluginId))

      await tx.insert(pluginVersion).values({
        id: versionId,
        pluginId,
        version: manifest.version,
        manifest: JSON.stringify(manifest),
        isLatest: true,
        validationStatus,
        validationErrors:
          validationResult.errors.length > 0
            ? JSON.stringify(validationResult.errors)
            : null,
        validationWarnings:
          validationResult.warnings.length > 0
            ? JSON.stringify(validationResult.warnings)
            : null,
        publishedAt: now,
        createdAt: now,
      })
    })

    const repoInfo = getPluginRepoInfo(mkt, pluginDef, ref, pluginSlug)
    const pluginBasePath = repoInfo ? getPluginBasePath(repoInfo) : undefined
    await createComponentsFromManifest(
      versionId,
      manifest,
      pluginBasePath,
      repoInfo
    )

    logger.info("Plugin version validated", {
      pluginSlug,
      version: manifest.version,
      validationStatus,
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings.length,
    })
  }

  return { isNew }
}

function getValidationStatus(
  result: ClaudeCodePluginValidationResult
): "valid" | "invalid" | "warning" {
  if (!result.valid) {
    return "invalid"
  }
  if (result.warnings.length > 0) {
    return "warning"
  }
  return "valid"
}

interface RepoInfo {
  owner: string
  repo: string
  ref: string
  path: string
}

function getPluginRepoInfo(
  mkt: typeof marketplace.$inferSelect,
  pluginDef: PluginDefinition,
  ref: string,
  pluginSlug: string
): RepoInfo | null {
  if (pluginDef.source?.startsWith("github:")) {
    const [repoFull, path] = pluginDef.source.replace("github:", "").split("#")
    if (!repoFull) return null
    const [owner, repo] = repoFull.split("/")
    if (!owner || !repo) return null
    const basePath = path ? path.replace(/\/plugin\.json$/, "") : ""
    return { owner, repo, ref, path: basePath }
  } else if (mkt.sourceRepo) {
    const [owner, repo] = mkt.sourceRepo.split("/")
    if (!owner || !repo) return null

    let pluginPath: string
    if (pluginDef.source?.startsWith("./")) {
      pluginPath = pluginDef.source.slice(2)
    } else if (pluginDef.path) {
      pluginPath = pluginDef.path
    } else {
      pluginPath = `plugins/${pluginSlug}`
    }
    return { owner, repo, ref, path: pluginPath }
  }
  return null
}

function getPluginBasePath(repoInfo: RepoInfo): string {
  return `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${repoInfo.path}`
}

async function discoverDirectoryComponents(
  basePath: string,
  repoInfo?: { owner: string; repo: string; ref: string; path: string }
): Promise<{
  commands: boolean
  agents: boolean
  skills: boolean
  hooks: boolean
}> {
  const result = { commands: false, agents: false, skills: false, hooks: false }

  if (repoInfo) {
    try {
      const treeUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.ref}?recursive=1`
      const response = await fetchWithTimeout(treeUrl, 15000)

      if (!response.ok) {
        logger.error("Tree API failed", {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          status: response.status,
        })
        return result
      }

      const data = (await response.json()) as {
        tree: Array<{ path: string; type: string }>
      }

      const pluginPrefix = repoInfo.path ? `${repoInfo.path}/` : ""

      for (const item of data.tree) {
        if (item.type !== "tree") continue
        const relativePath = item.path.startsWith(pluginPrefix)
          ? item.path.slice(pluginPrefix.length)
          : null

        if (relativePath === "commands") result.commands = true
        if (relativePath === "agents") result.agents = true
        if (relativePath === "skills") result.skills = true
        if (relativePath === "hooks") result.hooks = true
      }

      return result
    } catch (err) {
      logger.error("Failed to discover directories via Tree API", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  try {
    const response = await fetchWithTimeout(basePath, 10000)
    if (!response.ok) {
      logger.error("Contents API failed", {
        basePath,
        status: response.status,
      })
      return result
    }

    const contents = (await response.json()) as Array<{
      name: string
      type: string
    }>
    for (const item of contents) {
      if (item.type === "dir") {
        if (item.name === "commands") result.commands = true
        if (item.name === "agents") result.agents = true
        if (item.name === "skills") result.skills = true
        if (item.name === "hooks") result.hooks = true
      }
    }
  } catch (err) {
    logger.error("Failed to discover directories", {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return result
}

async function createComponentsFromManifest(
  versionId: string,
  manifest: z.infer<typeof pluginManifestSchema>,
  pluginBasePath?: string,
  repoInfo?: RepoInfo | null
): Promise<void> {
  const now = new Date()
  const components: Array<typeof pluginComponent.$inferInsert> = []

  const discoveredDirs =
    pluginBasePath || repoInfo
      ? await discoverDirectoryComponents(
          pluginBasePath || "",
          repoInfo || undefined
        )
      : { commands: false, agents: false, skills: false, hooks: false }

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
    if (typeof manifest.skills === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "skill",
        name: manifest.skills,
        config: JSON.stringify({ path: manifest.skills }),
        createdAt: now,
      })
    } else if (Array.isArray(manifest.skills)) {
      for (const skill of manifest.skills) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "skill",
          name: skill,
          config: JSON.stringify({ path: skill }),
          createdAt: now,
        })
      }
    } else {
      for (const [name, cfg] of Object.entries(manifest.skills)) {
        const skillConfig = cfg as SkillInlineConfig
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "skill",
          name,
          description: skillConfig.description,
          config: JSON.stringify({
            name: skillConfig.name,
            description: skillConfig.description,
            content: skillConfig.content,
            tags: skillConfig.tags,
            allowedTools: skillConfig.allowedTools,
            triggerPatterns: skillConfig.triggerPatterns,
          }),
          createdAt: now,
        })
      }
    }
  } else if (discoveredDirs.skills) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "skill",
      name: "skills",
      description: "Auto-discovered skills directory",
      config: JSON.stringify({ path: "skills", autoDiscovered: true }),
      createdAt: now,
    })
  }

  if (manifest.rules) {
    if (typeof manifest.rules === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "rule",
        name: manifest.rules,
        config: JSON.stringify({ path: manifest.rules }),
        createdAt: now,
      })
    } else if (Array.isArray(manifest.rules)) {
      for (const rule of manifest.rules) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "rule",
          name: rule,
          config: JSON.stringify({ path: rule }),
          createdAt: now,
        })
      }
    } else {
      for (const [name, cfg] of Object.entries(manifest.rules)) {
        const ruleConfig = cfg as RuleInlineConfig
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "rule",
          name,
          description: ruleConfig.description,
          config: JSON.stringify({
            name: ruleConfig.name,
            description: ruleConfig.description,
            content: ruleConfig.content,
            priority: ruleConfig.priority ?? 100,
            scope: ruleConfig.scope ?? "namespace",
          }),
          createdAt: now,
        })
      }
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
  } else if (discoveredDirs.commands) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "command",
      name: "commands",
      description: "Auto-discovered commands directory",
      config: JSON.stringify({ path: "commands", autoDiscovered: true }),
      createdAt: now,
    })
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
  } else if (discoveredDirs.agents) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "agent",
      name: "agents",
      description: "Auto-discovered agents directory",
      config: JSON.stringify({ path: "agents", autoDiscovered: true }),
      createdAt: now,
    })
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
  } else if (discoveredDirs.hooks) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "hook",
      name: "hooks",
      description: "Auto-discovered hooks directory",
      config: JSON.stringify({ path: "hooks", autoDiscovered: true }),
      createdAt: now,
    })
  }

  if (manifest.lspServers) {
    if (typeof manifest.lspServers === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "lsp_server",
        name: "LSP Server",
        config: JSON.stringify({ path: manifest.lspServers }),
        createdAt: now,
      })
    } else {
      for (const [name, config] of Object.entries(manifest.lspServers)) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "lsp_server",
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

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "169.254.169.254",
  "metadata.google.internal",
])

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024

function isUrlAllowed(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return { allowed: false, reason: "Only HTTP/HTTPS URLs are allowed" }
    }

    if (parsed.hostname.endsWith(".local") || parsed.hostname.endsWith(".internal")) {
      return { allowed: false, reason: "Internal/local hostnames are not allowed" }
    }

    if (BLOCKED_HOSTS.has(parsed.hostname)) {
      return { allowed: false, reason: "This host is blocked for security reasons" }
    }

    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/
    if (ipRegex.test(parsed.hostname)) {
      const parts = parsed.hostname.split(".").map(Number)
      if (parts[0] === 10 || parts[0] === 127) {
        return { allowed: false, reason: "Private IP addresses are not allowed" }
      }
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return { allowed: false, reason: "Private IP addresses are not allowed" }
      }
      if (parts[0] === 192 && parts[1] === 168) {
        return { allowed: false, reason: "Private IP addresses are not allowed" }
      }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: "Invalid URL" }
  }
}

async function fetchWithSecurityCheck(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const urlCheck = isUrlAllowed(url)
  if (!urlCheck.allowed) {
    throw new Error(`URL blocked: ${urlCheck.reason}`)
  }

  const response = await fetchWithTimeout(url, timeoutMs)

  const contentLength = response.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes`)
  }

  return response
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

  if (!mkt.sourceUrl) {
    result.errors.push("Marketplace has no sourceUrl configured")
    return result
  }

  try {
    logger.info("Starting URL sync", {
      marketplaceId: mkt.id,
      sourceUrl: mkt.sourceUrl,
    })

    const response = await fetchWithSecurityCheck(mkt.sourceUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch marketplace.json: ${response.status}`)
    }

    const rawData = await response.json()
    const parseResult = marketplaceFileSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new Error(`Invalid marketplace.json: ${parseResult.error.message}`)
    }
    const marketplaceFile = parseResult.data

    const remotePluginSlugs: string[] = []

    for (const pluginDef of marketplaceFile.plugins) {
      const pluginSlug = pluginDef.slug || pluginDef.name
      if (!pluginSlug) {
        result.errors.push("Plugin missing both slug and name fields")
        continue
      }
      remotePluginSlugs.push(pluginSlug)

      try {
        const pluginResult = await syncPluginFromUrl(mkt, pluginDef, pluginSlug)

        if (pluginResult.isNew) {
          result.added++
        } else {
          result.updated++
        }

        logger.info("Plugin synced from URL", {
          pluginSlug,
          isNew: pluginResult.isNew,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error"
        result.errors.push(`Failed to sync plugin ${pluginSlug}: ${errorMessage}`)
        logger.error("Failed to sync plugin from URL", {
          pluginSlug,
          error: errorMessage,
        })
      }
    }

    const existingPlugins = await db().query.plugin.findMany({
      where: eq(plugin.marketplaceId, mkt.id),
    })

    const removedPlugins = existingPlugins.filter(
      (p) => !remotePluginSlugs.includes(p.slug)
    )

    for (const removedPlugin of removedPlugins) {
      await db().delete(plugin).where(eq(plugin.id, removedPlugin.id))
      result.removed++
      logger.info("Plugin removed", { pluginSlug: removedPlugin.slug })
    }

    await db()
      .update(marketplace)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplace.id, mkt.id))

    logger.info("URL sync completed", {
      marketplaceId: mkt.id,
      added: result.added,
      updated: result.updated,
      removed: result.removed,
      errors: result.errors.length,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    result.errors.push(`Sync failed: ${errorMessage}`)
    logger.error("URL sync failed", {
      marketplaceId: mkt.id,
      error: errorMessage,
    })
  }

  return result
}

async function syncPluginFromUrl(
  mkt: typeof marketplace.$inferSelect,
  pluginDef: PluginDefinition,
  pluginSlug: string
): Promise<{ isNew: boolean }> {
  let manifestUrl: string | undefined

  if (pluginDef.manifestUrl) {
    manifestUrl = pluginDef.manifestUrl
  } else if (pluginDef.source?.startsWith("http://") || pluginDef.source?.startsWith("https://")) {
    manifestUrl = pluginDef.source
  } else if (pluginDef.source?.startsWith("github:")) {
    const [repo, path] = pluginDef.source.replace("github:", "").split("#")
    const manifestPath = path || ".claude-plugin/plugin.json"
    manifestUrl = `https://raw.githubusercontent.com/${repo}/main/${manifestPath}`
  }

  if (!manifestUrl) {
    throw new Error(
      "Plugin definition must have manifestUrl or a valid source (http/https URL or github:)"
    )
  }

  const response = await fetchWithSecurityCheck(manifestUrl)
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
    where: and(eq(plugin.marketplaceId, mkt.id), eq(plugin.slug, pluginSlug)),
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
        slug: pluginSlug,
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
    const versionId = generatePluginVersionId()
    const validationResult = validateClaudeCodePlugin(rawManifest)
    const validationStatus = getValidationStatus(validationResult)

    await db().transaction(async (tx) => {
      await tx
        .update(pluginVersion)
        .set({ isLatest: false })
        .where(eq(pluginVersion.pluginId, pluginId))

      await tx.insert(pluginVersion).values({
        id: versionId,
        pluginId,
        version: manifest.version,
        manifest: JSON.stringify(manifest),
        isLatest: true,
        validationStatus,
        validationErrors:
          validationResult.errors.length > 0
            ? JSON.stringify(validationResult.errors)
            : null,
        validationWarnings:
          validationResult.warnings.length > 0
            ? JSON.stringify(validationResult.warnings)
            : null,
        publishedAt: now,
        createdAt: now,
      })
    })

    await createComponentsFromManifest(versionId, manifest, undefined, null)

    logger.info("Plugin version validated (URL)", {
      pluginSlug,
      version: manifest.version,
      validationStatus,
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings.length,
    })
  }

  return { isNew }
}
