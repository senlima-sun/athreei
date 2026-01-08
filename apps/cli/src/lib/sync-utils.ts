import type { McpServerConfig } from "./config-schema"
import type { McpServer } from "./types"

export type SyncStatus = "in-sync" | "local-only" | "cloud-only" | "conflict"

export interface ServerComparison {
  name: string
  status: SyncStatus
  local?: McpServerConfig
  cloud?: McpServer
  differences?: string[]
}

export interface SyncDiffResult {
  inSync: ServerComparison[]
  localOnly: ServerComparison[]
  cloudOnly: ServerComparison[]
  conflicts: ServerComparison[]
  summary: {
    inSyncCount: number
    localOnlyCount: number
    cloudOnlyCount: number
    conflictCount: number
    isInSync: boolean
  }
}

export type ConflictResolution = "keep-local" | "use-cloud" | "skip"

export interface MergeOptions {
  conflictResolution?: ConflictResolution
  resolveConflict?: (
    comparison: ServerComparison
  ) => Promise<ConflictResolution>
}

// Normalize server name for case-insensitive comparison
function normalizeServerName(name: string): string {
  return name.toLowerCase().trim()
}

// Convert cloud MCP server to local config format
export function cloudToLocalConfig(cloud: McpServer): McpServerConfig {
  const config: McpServerConfig = {
    name: cloud.name,
    transport: cloud.transport,
  }

  if (cloud.description) {
    config.description = cloud.description
  }

  if (cloud.transport === "stdio") {
    if (cloud.command) config.command = cloud.command
    if (cloud.args && cloud.args.length > 0) config.args = cloud.args
  } else {
    if (cloud.url) config.url = cloud.url
  }

  return config
}

// Convert local config to cloud request format
export function localToCloudRequest(
  local: McpServerConfig,
  organizationId: string
): {
  name: string
  description?: string
  transport: "stdio" | "sse" | "streamable-http"
  command?: string
  args?: string[]
  url?: string
  organizationId: string
} {
  const request: {
    name: string
    description?: string
    transport: "stdio" | "sse" | "streamable-http"
    command?: string
    args?: string[]
    url?: string
    organizationId: string
  } = {
    name: local.name,
    transport: local.transport,
    organizationId,
  }

  if (local.description) {
    request.description = local.description
  }

  if (local.transport === "stdio") {
    if (local.command) request.command = local.command
    if (local.args && local.args.length > 0) request.args = local.args
  } else {
    if (local.url) request.url = local.url
  }

  return request
}

// Find differences between local and cloud configurations
function findDifferences(local: McpServerConfig, cloud: McpServer): string[] {
  const differences: string[] = []

  if (local.transport !== cloud.transport) {
    differences.push(`transport: ${local.transport} vs ${cloud.transport}`)
  }

  if ((local.description ?? null) !== (cloud.description ?? null)) {
    differences.push(
      `description: "${local.description ?? "(none)"}" vs "${cloud.description ?? "(none)"}"`
    )
  }

  if (local.transport === "stdio" && cloud.transport === "stdio") {
    if ((local.command ?? null) !== (cloud.command ?? null)) {
      differences.push(
        `command: "${local.command ?? "(none)"}" vs "${cloud.command ?? "(none)"}"`
      )
    }

    const localArgs = (local.args ?? []).join(" ")
    const cloudArgs = (cloud.args ?? []).join(" ")
    if (localArgs !== cloudArgs) {
      differences.push(
        `args: "${localArgs || "(none)"}" vs "${cloudArgs || "(none)"}"`
      )
    }
  }

  if (
    (local.transport === "sse" || local.transport === "streamable-http") &&
    (cloud.transport === "sse" || cloud.transport === "streamable-http")
  ) {
    if ((local.url ?? null) !== (cloud.url ?? null)) {
      differences.push(
        `url: "${local.url ?? "(none)"}" vs "${cloud.url ?? "(none)"}"`
      )
    }
  }

  return differences
}

// Check if two servers are equivalent (in-sync)
function serversMatch(local: McpServerConfig, cloud: McpServer): boolean {
  return findDifferences(local, cloud).length === 0
}

// Compare local and cloud configurations
export function compareConfigs(
  localServers: McpServerConfig[],
  cloudServers: McpServer[]
): SyncDiffResult {
  const inSync: ServerComparison[] = []
  const localOnly: ServerComparison[] = []
  const cloudOnly: ServerComparison[] = []
  const conflicts: ServerComparison[] = []

  // Create maps for efficient lookup
  const localByName = new Map<string, McpServerConfig>()
  for (const server of localServers) {
    localByName.set(normalizeServerName(server.name), server)
  }

  const cloudByName = new Map<string, McpServer>()
  for (const server of cloudServers) {
    cloudByName.set(normalizeServerName(server.name), server)
  }

  // Process local servers
  for (const [normalizedName, local] of localByName) {
    const cloud = cloudByName.get(normalizedName)

    if (!cloud) {
      localOnly.push({
        name: local.name,
        status: "local-only",
        local,
      })
    } else if (serversMatch(local, cloud)) {
      inSync.push({
        name: local.name,
        status: "in-sync",
        local,
        cloud,
      })
    } else {
      conflicts.push({
        name: local.name,
        status: "conflict",
        local,
        cloud,
        differences: findDifferences(local, cloud),
      })
    }
  }

  // Find cloud-only servers
  for (const [normalizedName, cloud] of cloudByName) {
    if (!localByName.has(normalizedName)) {
      cloudOnly.push({
        name: cloud.name,
        status: "cloud-only",
        cloud,
      })
    }
  }

  const summary = {
    inSyncCount: inSync.length,
    localOnlyCount: localOnly.length,
    cloudOnlyCount: cloudOnly.length,
    conflictCount: conflicts.length,
    isInSync:
      localOnly.length === 0 &&
      cloudOnly.length === 0 &&
      conflicts.length === 0,
  }

  return {
    inSync,
    localOnly,
    cloudOnly,
    conflicts,
    summary,
  }
}

// Merge servers from cloud into local config
export async function mergeMcpServers(
  localServers: McpServerConfig[],
  cloudServers: McpServer[],
  options: MergeOptions = {}
): Promise<{
  result: McpServerConfig[]
  added: string[]
  updated: string[]
  skipped: string[]
}> {
  const { conflictResolution, resolveConflict } = options

  const diff = compareConfigs(localServers, cloudServers)

  // Start with in-sync servers (no changes needed)
  const result: McpServerConfig[] = [...diff.inSync.map((c) => c.local!)]

  const added: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  // Add cloud-only servers
  for (const comparison of diff.cloudOnly) {
    result.push(cloudToLocalConfig(comparison.cloud!))
    added.push(comparison.name)
  }

  // Keep local-only servers
  for (const comparison of diff.localOnly) {
    result.push(comparison.local!)
    // These are not skipped, they remain local
  }

  // Handle conflicts
  for (const comparison of diff.conflicts) {
    let resolution = conflictResolution

    if (!resolution && resolveConflict) {
      resolution = await resolveConflict(comparison)
    }

    if (!resolution) {
      resolution = "skip"
    }

    switch (resolution) {
      case "keep-local":
        result.push(comparison.local!)
        skipped.push(comparison.name)
        break
      case "use-cloud":
        result.push(cloudToLocalConfig(comparison.cloud!))
        updated.push(comparison.name)
        break
      case "skip":
      default:
        result.push(comparison.local!)
        skipped.push(comparison.name)
        break
    }
  }

  return { result, added, updated, skipped }
}

// Format diff for display
export function formatDiffLine(
  prefix: string,
  name: string,
  details?: string
): string {
  if (details) {
    return `${prefix} ${name}: ${details}`
  }
  return `${prefix} ${name}`
}

// Generate unified diff-like output
export interface DiffLine {
  type: "add" | "remove" | "modify" | "context"
  text: string
}

export function generateDiffLines(diff: SyncDiffResult): DiffLine[] {
  const lines: DiffLine[] = []

  // In-sync items (context)
  for (const item of diff.inSync) {
    lines.push({ type: "context", text: `  ${item.name}` })
  }

  // Local-only items (would be added to cloud on push)
  for (const item of diff.localOnly) {
    lines.push({ type: "add", text: `+ ${item.name} (local only)` })
  }

  // Cloud-only items (would be added locally on pull)
  for (const item of diff.cloudOnly) {
    lines.push({ type: "remove", text: `- ${item.name} (cloud only)` })
  }

  // Conflicts
  for (const item of diff.conflicts) {
    lines.push({ type: "modify", text: `~ ${item.name} (conflict)` })
    if (item.differences) {
      for (const diff of item.differences) {
        lines.push({ type: "modify", text: `    ${diff}` })
      }
    }
  }

  return lines
}

// Export JSON-friendly diff format
export interface JsonDiff {
  status: "in-sync" | "out-of-sync"
  summary: SyncDiffResult["summary"]
  inSync: Array<{ name: string }>
  localOnly: Array<{ name: string; config: McpServerConfig }>
  cloudOnly: Array<{ name: string; id: string }>
  conflicts: Array<{
    name: string
    localConfig: McpServerConfig
    cloudConfig: {
      id: string
      transport: string
      command?: string
      url?: string
    }
    differences: string[]
  }>
}

export function toJsonDiff(diff: SyncDiffResult): JsonDiff {
  return {
    status: diff.summary.isInSync ? "in-sync" : "out-of-sync",
    summary: diff.summary,
    inSync: diff.inSync.map((item) => ({ name: item.name })),
    localOnly: diff.localOnly.map((item) => ({
      name: item.name,
      config: item.local!,
    })),
    cloudOnly: diff.cloudOnly.map((item) => ({
      name: item.name,
      id: item.cloud!.id,
    })),
    conflicts: diff.conflicts.map((item) => ({
      name: item.name,
      localConfig: item.local!,
      cloudConfig: {
        id: item.cloud!.id,
        transport: item.cloud!.transport,
        command: item.cloud!.command,
        url: item.cloud!.url,
      },
      differences: item.differences ?? [],
    })),
  }
}
