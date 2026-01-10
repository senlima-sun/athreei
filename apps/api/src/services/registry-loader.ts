import { readFile } from "fs/promises"
import { join } from "path"
import {
  validateRegistryFile,
  type RegistryMcpServer,
  type RegistryFile,
} from "@athreei/shared"

export interface RegistryLoaderConfig {
  source: "local" | "remote"
  localPath?: string
  remoteUrl?: string
  cacheTtlMs?: number
}

interface CacheEntry {
  data: RegistryFile
  timestamp: number
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

let cache: CacheEntry | null = null
let config: RegistryLoaderConfig | null = null

export function initRegistryLoader(loaderConfig: RegistryLoaderConfig): void {
  config = loaderConfig
  cache = null
}

function getConfig(): RegistryLoaderConfig {
  if (config) {
    return config
  }

  const source = (process.env.REGISTRY_SOURCE as "local" | "remote") || "local"
  const localPath =
    process.env.REGISTRY_LOCAL_PATH ||
    join(process.cwd(), "../../registry/mcp-servers.json")
  const remoteUrl = process.env.REGISTRY_REMOTE_URL
  const cacheTtlMs = process.env.REGISTRY_CACHE_TTL_MS
    ? parseInt(process.env.REGISTRY_CACHE_TTL_MS, 10)
    : DEFAULT_CACHE_TTL_MS

  return {
    source,
    localPath,
    remoteUrl,
    cacheTtlMs,
  }
}

function isCacheValid(): boolean {
  if (!cache) return false
  const cfg = getConfig()
  const ttl = cfg.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  return Date.now() - cache.timestamp < ttl
}

async function loadFromLocal(path: string): Promise<RegistryFile> {
  const content = await readFile(path, "utf-8")
  const data = JSON.parse(content)
  return validateRegistryFile(data)
}

async function loadFromRemote(url: string): Promise<RegistryFile> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch registry: ${response.status}`)
  }
  const data = await response.json()
  return validateRegistryFile(data)
}

export async function loadRegistry(): Promise<RegistryFile> {
  if (isCacheValid() && cache) {
    return cache.data
  }

  const cfg = getConfig()
  let data: RegistryFile

  if (cfg.source === "remote" && cfg.remoteUrl) {
    data = await loadFromRemote(cfg.remoteUrl)
  } else if (cfg.localPath) {
    data = await loadFromLocal(cfg.localPath)
  } else {
    throw new Error(
      "Registry loader not configured: no local path or remote URL"
    )
  }

  cache = {
    data,
    timestamp: Date.now(),
  }

  return data
}

export async function getRegistryServers(): Promise<RegistryMcpServer[]> {
  const registry = await loadRegistry()
  return registry.servers
}

export async function getRegistryServerBySlug(
  slug: string
): Promise<RegistryMcpServer | undefined> {
  const servers = await getRegistryServers()
  return servers.find((s) => s.slug === slug)
}

export async function getRegistryCategories(): Promise<string[]> {
  const servers = await getRegistryServers()
  return [...new Set(servers.flatMap((s) => s.categories))].sort()
}

export function clearRegistryCache(): void {
  cache = null
}

export function getRegistryCacheStatus(): {
  cached: boolean
  timestamp: number | null
  ttlMs: number
} {
  const cfg = getConfig()
  return {
    cached: cache !== null,
    timestamp: cache?.timestamp ?? null,
    ttlMs: cfg.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
  }
}
