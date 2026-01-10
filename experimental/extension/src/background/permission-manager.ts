/**
 * Permission Manager
 *
 * Responsibilities:
 * - Cache and fetch permissions from MCP server
 * - Check if an origin is allowed to use a specific tool
 * - Handle cache invalidation with TTL
 */

import type { PermissionLevel } from "@athreei/shared"

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MCP_SERVER_URL = "http://localhost:3001"
const STORAGE_KEY_PREFIX = "permission_cache_"

interface CachedPermission {
  level: PermissionLevel
  timestamp: number
}

class PermissionManagerImpl {
  private memoryCache: Map<string, CachedPermission> = new Map()

  /**
   * Generate cache key for origin + tool combination
   */
  private getCacheKey(origin: string, tool: string): string {
    return `${origin}:${tool}`
  }

  /**
   * Check if cached permission is still valid
   */
  private isCacheValid(cached: CachedPermission): boolean {
    return Date.now() - cached.timestamp < CACHE_TTL_MS
  }

  /**
   * Get permission from memory cache
   */
  private getFromMemoryCache(
    origin: string,
    tool: string
  ): PermissionLevel | null {
    const key = this.getCacheKey(origin, tool)
    const cached = this.memoryCache.get(key)

    if (cached && this.isCacheValid(cached)) {
      return cached.level
    }

    // Clean up expired entry
    if (cached) {
      this.memoryCache.delete(key)
    }

    return null
  }

  /**
   * Get permission from chrome.storage.local
   */
  private async getFromStorageCache(
    origin: string,
    tool: string
  ): Promise<PermissionLevel | null> {
    try {
      const storageKey = STORAGE_KEY_PREFIX + this.getCacheKey(origin, tool)
      const result = await chrome.storage.local.get(storageKey)
      const cached = result[storageKey] as CachedPermission | undefined

      if (cached && this.isCacheValid(cached)) {
        // Update memory cache
        this.memoryCache.set(this.getCacheKey(origin, tool), cached)
        return cached.level
      }

      // Clean up expired entry
      if (cached) {
        await chrome.storage.local.remove(storageKey)
      }

      return null
    } catch (error) {
      console.error(
        "[PermissionManager] Error reading from storage cache:",
        error
      )
      return null
    }
  }

  /**
   * Fetch permission from MCP server
   */
  private async fetchFromServer(
    origin: string,
    tool: string
  ): Promise<PermissionLevel> {
    try {
      const url = new URL("/api/permissions", MCP_SERVER_URL)
      url.searchParams.set("origin", origin)
      url.searchParams.set("tool", tool)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error(
          `[PermissionManager] Server returned ${response.status}: ${response.statusText}`
        )
        // Default to "ask" on server error
        return "ask"
      }

      const data = await response.json()
      const level = data.allowed

      // Validate response before using
      if (!["allowed", "denied", "ask"].includes(level)) {
        console.error(
          "[PermissionManager] Invalid permission level from server:",
          level
        )
        return "ask"
      }

      const validLevel = level as PermissionLevel

      // Cache the result
      await this.cachePermission(origin, tool, validLevel)

      return validLevel
    } catch (error) {
      console.error("[PermissionManager] Error fetching from server:", error)
      // Default to "ask" on error
      return "ask"
    }
  }

  /**
   * Cache permission in both memory and storage
   */
  private async cachePermission(
    origin: string,
    tool: string,
    level: PermissionLevel
  ): Promise<void> {
    const cached: CachedPermission = {
      level,
      timestamp: Date.now(),
    }

    const key = this.getCacheKey(origin, tool)

    // Update memory cache
    this.memoryCache.set(key, cached)

    // Update storage cache
    try {
      const storageKey = STORAGE_KEY_PREFIX + key
      await chrome.storage.local.set({ [storageKey]: cached })
    } catch (error) {
      console.error(
        "[PermissionManager] Error writing to storage cache:",
        error
      )
    }
  }

  /**
   * Check permission for origin + tool combination
   *
   * Returns the permission level: "allowed", "denied", or "ask"
   */
  async checkPermission(
    origin: string,
    tool: string
  ): Promise<PermissionLevel> {
    console.log(
      `[PermissionManager] Checking permission for ${origin} -> ${tool}`
    )

    // 1. Check memory cache
    const memCached = this.getFromMemoryCache(origin, tool)
    if (memCached) {
      console.log(`[PermissionManager] Memory cache hit: ${memCached}`)
      return memCached
    }

    // 2. Check storage cache
    const storageCached = await this.getFromStorageCache(origin, tool)
    if (storageCached) {
      console.log(`[PermissionManager] Storage cache hit: ${storageCached}`)
      return storageCached
    }

    // 3. Fetch from server
    console.log("[PermissionManager] Cache miss, fetching from server")
    const level = await this.fetchFromServer(origin, tool)
    console.log(`[PermissionManager] Server returned: ${level}`)

    return level
  }

  /**
   * Check if action is allowed (permission level is "allowed")
   */
  async isAllowed(origin: string, tool: string): Promise<boolean> {
    const level = await this.checkPermission(origin, tool)
    return level === "allowed"
  }

  /**
   * Check if action requires user prompt (permission level is "ask")
   */
  async requiresPrompt(origin: string, tool: string): Promise<boolean> {
    const level = await this.checkPermission(origin, tool)
    return level === "ask"
  }

  /**
   * Clear all cached permissions
   */
  async clearCache(): Promise<void> {
    console.log("[PermissionManager] Clearing permission cache")

    // Clear memory cache
    this.memoryCache.clear()

    // Clear storage cache
    try {
      const allKeys = await chrome.storage.local.get(null)
      const permissionKeys = Object.keys(allKeys).filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX)
      )

      if (permissionKeys.length > 0) {
        await chrome.storage.local.remove(permissionKeys)
      }
    } catch (error) {
      console.error("[PermissionManager] Error clearing storage cache:", error)
    }
  }

  /**
   * Invalidate cache for specific origin + tool combination
   */
  async invalidateCache(origin: string, tool: string): Promise<void> {
    const key = this.getCacheKey(origin, tool)

    // Remove from memory cache
    this.memoryCache.delete(key)

    // Remove from storage cache
    try {
      const storageKey = STORAGE_KEY_PREFIX + key
      await chrome.storage.local.remove(storageKey)
    } catch (error) {
      console.error(
        "[PermissionManager] Error invalidating storage cache:",
        error
      )
    }
  }
}

export const permissionManager = new PermissionManagerImpl()

// Helper exports
export const checkPermission = (
  origin: string,
  tool: string
): Promise<PermissionLevel> => permissionManager.checkPermission(origin, tool)

export const isAllowed = (origin: string, tool: string): Promise<boolean> =>
  permissionManager.isAllowed(origin, tool)

export const requiresPrompt = (
  origin: string,
  tool: string
): Promise<boolean> => permissionManager.requiresPrompt(origin, tool)
