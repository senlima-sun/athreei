/**
 * Token Refresh Manager
 *
 * Handles proactive and reactive token refresh for OAuth tokens.
 * - Proactive: Refreshes at 75% of TTL before expiration
 * - Reactive: Refreshes on 401 with exponential backoff
 */

import {
  refreshAuthorization,
  discoverOAuthMetadata,
} from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthTokens, OAuthClientInformation } from "@modelcontextprotocol/sdk/shared/auth.js"
import type { EncryptedTokenStore } from "./token-store.js"
import type { StoredTokenData } from "./types.js"
import { log } from "../logger.js"

/** Minimum time before scheduling refresh (1 minute) */
const MIN_REFRESH_DELAY = 60_000

/** Maximum backoff time for failed refreshes (1 minute) */
const MAX_BACKOFF = 60_000

/** Initial backoff time (1 second) */
const INITIAL_BACKOFF = 1_000

/**
 * Token Refresh Manager
 */
export class TokenRefreshManager {
  private tokenStore: EncryptedTokenStore
  private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private refreshLocks = new Map<string, Promise<StoredTokenData>>()
  private retryBackoff = new Map<string, number>()

  constructor(tokenStore: EncryptedTokenStore) {
    this.tokenStore = tokenStore
  }

  /**
   * Schedule proactive refresh for a token
   */
  scheduleRefresh(serverUrl: string, token: StoredTokenData): void {
    // Clear existing timer
    const existing = this.refreshTimers.get(serverUrl)
    if (existing) {
      clearTimeout(existing)
      this.refreshTimers.delete(serverUrl)
    }

    // Can't refresh without refresh token or expiry
    if (!token.refresh_token || !token.expiresAt) {
      log.debug(`Cannot schedule refresh for ${token.provider} - no refresh token or expiry`)
      return
    }

    // Calculate refresh time (75% of TTL)
    const ttl = token.expiresAt - Date.now()
    if (ttl <= 0) {
      log.debug(`Token for ${token.provider} already expired`)
      return
    }

    const refreshIn = Math.max(ttl * 0.75, MIN_REFRESH_DELAY)

    log.debug(
      `Scheduling token refresh for ${token.provider} in ${Math.round(refreshIn / 1000)}s`
    )

    const timer = setTimeout(() => {
      this.refreshToken(serverUrl).catch((error) => {
        log.error(`Proactive refresh failed for ${token.provider}:`, error)
      })
    }, refreshIn)

    this.refreshTimers.set(serverUrl, timer)
  }

  /**
   * Refresh token (with mutex to prevent concurrent refreshes)
   */
  async refreshToken(serverUrl: string): Promise<StoredTokenData> {
    // Check for existing refresh in progress
    const existing = this.refreshLocks.get(serverUrl)
    if (existing) {
      log.debug(`Refresh already in progress for ${serverUrl}, waiting...`)
      return existing
    }

    // Check backoff
    const backoffUntil = this.retryBackoff.get(serverUrl) ?? 0
    if (Date.now() < backoffUntil) {
      const waitTime = backoffUntil - Date.now()
      throw new Error(`Refresh rate limited, retry after ${waitTime}ms`)
    }

    // Create refresh promise with lock
    const refreshPromise = this.doRefresh(serverUrl)
      .then((result) => {
        // Clear backoff on success
        this.retryBackoff.delete(serverUrl)
        return result
      })
      .catch((error) => {
        // Apply exponential backoff on failure
        const currentBackoff = this.retryBackoff.get(serverUrl) ?? INITIAL_BACKOFF
        const nextBackoff = Math.min(currentBackoff * 2, MAX_BACKOFF)
        this.retryBackoff.set(serverUrl, Date.now() + nextBackoff)
        log.warn(
          `Refresh failed, backing off for ${nextBackoff}ms:`,
          error instanceof Error ? error.message : error
        )
        throw error
      })
      .finally(() => {
        this.refreshLocks.delete(serverUrl)
      })

    this.refreshLocks.set(serverUrl, refreshPromise)
    return refreshPromise
  }

  /**
   * Internal refresh implementation
   */
  private async doRefresh(serverUrl: string): Promise<StoredTokenData> {
    const token = await this.tokenStore.get(serverUrl)
    if (!token) {
      throw new Error(`No token found for ${serverUrl}`)
    }

    if (!token.refresh_token) {
      throw new Error(`No refresh token available for ${token.provider}`)
    }

    log.info(`Refreshing token for ${token.provider}...`)

    // Discover OAuth metadata
    const metadata = await discoverOAuthMetadata(serverUrl)
    if (!metadata) {
      throw new Error(`Could not discover OAuth metadata for ${serverUrl}`)
    }

    // Create minimal client info for refresh
    const clientInfo: OAuthClientInformation = {
      client_id: "athreei-gateway",
    }

    // Refresh the token
    const newTokens = await refreshAuthorization(serverUrl, {
      metadata,
      clientInformation: clientInfo,
      refreshToken: token.refresh_token,
    })

    // Update stored token
    const now = Date.now()
    const updatedToken: StoredTokenData = {
      access_token: newTokens.access_token,
      // Preserve old refresh token if not rotated
      refresh_token: newTokens.refresh_token ?? token.refresh_token,
      token_type: newTokens.token_type,
      expires_in: newTokens.expires_in,
      scope: newTokens.scope ?? token.scope,
      expiresAt: newTokens.expires_in
        ? now + newTokens.expires_in * 1000
        : token.expiresAt,
      obtainedAt: now,
      provider: token.provider,
      serverUrl: token.serverUrl,
    }

    await this.tokenStore.set(serverUrl, updatedToken)
    log.info(`Successfully refreshed token for ${token.provider}`)

    // Schedule next refresh
    this.scheduleRefresh(serverUrl, updatedToken)

    return updatedToken
  }

  /**
   * Handle 401 response - try to refresh token
   */
  async handleUnauthorized(serverUrl: string): Promise<StoredTokenData | null> {
    try {
      return await this.refreshToken(serverUrl)
    } catch (error) {
      log.error(
        `Failed to refresh token on 401:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  /**
   * Stop all scheduled refreshes
   */
  stopAll(): void {
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer)
    }
    this.refreshTimers.clear()
    this.retryBackoff.clear()
    log.debug("Stopped all token refresh timers")
  }

  /**
   * Initialize refresh schedules for all stored tokens
   */
  async initializeRefreshSchedules(): Promise<void> {
    const tokens = await this.tokenStore.list()

    for (const { serverUrl } of tokens) {
      const token = await this.tokenStore.get(serverUrl)
      if (token) {
        this.scheduleRefresh(serverUrl, token)
      }
    }

    log.debug(`Initialized refresh schedules for ${tokens.length} tokens`)
  }
}

/**
 * Parse WWW-Authenticate header for OAuth error details
 */
export function parseWWWAuthenticate(header: string | null): {
  error?: string
  errorDescription?: string
  scope?: string
} {
  if (!header) return {}

  const result: ReturnType<typeof parseWWWAuthenticate> = {}

  // Parse Bearer realm="...", error="...", error_description="...", scope="..."
  const errorMatch = header.match(/error="([^"]+)"/)
  if (errorMatch) result.error = errorMatch[1]

  const descMatch = header.match(/error_description="([^"]+)"/)
  if (descMatch) result.errorDescription = descMatch[1]

  const scopeMatch = header.match(/scope="([^"]+)"/)
  if (scopeMatch) result.scope = scopeMatch[1]

  return result
}

/**
 * OAuth error types for specific handling
 */
export type OAuthErrorType =
  | "invalid_token"
  | "invalid_grant"
  | "access_denied"
  | "insufficient_scope"
  | "unknown"

/**
 * Categorize OAuth error for handling
 */
export function categorizeOAuthError(error?: string): OAuthErrorType {
  switch (error) {
    case "invalid_token":
      return "invalid_token"
    case "invalid_grant":
      return "invalid_grant"
    case "access_denied":
      return "access_denied"
    case "insufficient_scope":
      return "insufficient_scope"
    default:
      return "unknown"
  }
}
