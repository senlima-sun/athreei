/**
 * OAuth Module
 *
 * Provides OAuth 2.1 authentication for MCP servers.
 * Implements the MCP OAuth specification for browser-based authorization.
 */

import {
  auth,
  discoverOAuthProtectedResourceMetadata,
  discoverOAuthMetadata,
} from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"

import { AthreeiOAuthProvider, detectProvider } from "./provider.js"
import {
  EncryptedTokenStore,
  createTokenStore,
  isKeychainAvailable,
} from "./token-store.js"
import { TokenRefreshManager, parseWWWAuthenticate, categorizeOAuthError } from "./refresh.js"
import type { StoredTokenData, KeySource, OAuthFlowResult } from "./types.js"
import { log } from "../logger.js"

export {
  AthreeiOAuthProvider,
  EncryptedTokenStore,
  TokenRefreshManager,
  detectProvider,
  createTokenStore,
  isKeychainAvailable,
  parseWWWAuthenticate,
  categorizeOAuthError,
}

export type { StoredTokenData, KeySource, OAuthFlowResult }

/**
 * OAuth Manager
 *
 * High-level interface for OAuth operations in the gateway.
 */
export class OAuthManager {
  private tokenStore: EncryptedTokenStore
  private refreshManager: TokenRefreshManager
  private initialized = false

  constructor(tokenStore: EncryptedTokenStore) {
    this.tokenStore = tokenStore
    this.refreshManager = new TokenRefreshManager(tokenStore)
  }

  /**
   * Initialize the OAuth manager
   * Sets up refresh schedules for existing tokens
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.refreshManager.initializeRefreshSchedules()
    this.initialized = true
    log.info("OAuth manager initialized")
  }

  /**
   * Check if a server URL requires OAuth authentication
   * Returns true if we get a 401 or discover OAuth metadata
   */
  async requiresOAuth(serverUrl: string): Promise<boolean> {
    try {
      // Try to discover OAuth metadata
      const resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl)
      if (resourceMetadata?.authorization_servers?.length) {
        return true
      }

      const metadata = await discoverOAuthMetadata(serverUrl)
      return !!metadata
    } catch {
      return false
    }
  }

  /**
   * Get a valid access token for a server URL
   * Returns null if no token exists or refresh fails
   */
  async getAccessToken(serverUrl: string): Promise<string | null> {
    const token = await this.tokenStore.get(serverUrl)
    if (!token) return null

    // Check if expired
    if (token.expiresAt && Date.now() > token.expiresAt) {
      // Try to refresh
      try {
        const refreshed = await this.refreshManager.refreshToken(serverUrl)
        return refreshed.access_token
      } catch {
        return null
      }
    }

    return token.access_token
  }

  /**
   * Get authorization headers for a server URL
   */
  async getAuthHeaders(serverUrl: string): Promise<Record<string, string>> {
    const token = await this.getAccessToken(serverUrl)
    if (!token) return {}

    return {
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Initiate OAuth flow for a server
   */
  async initiateOAuth(
    serverUrl: string,
    options?: {
      scope?: string
      prompt?: (message: string) => Promise<void>
    }
  ): Promise<OAuthFlowResult> {
    const provider = detectProvider(serverUrl)
    log.info(`Initiating OAuth flow for ${provider}`)

    // Prompt user if callback provided
    if (options?.prompt) {
      await options.prompt(
        `\n${provider} requires authorization.\nPress Enter to open browser and sign in...`
      )
    }

    // Create provider
    const oauthProvider = new AthreeiOAuthProvider(
      serverUrl,
      this.tokenStore,
      provider
    )

    try {
      // Start callback server
      await oauthProvider.startCallbackServer()

      // Run OAuth flow using MCP SDK
      const result = await auth(oauthProvider, {
        serverUrl,
        scope: options?.scope,
      })

      if (result === "AUTHORIZED") {
        // Get the stored token
        const token = await this.tokenStore.get(serverUrl)
        if (token) {
          // Schedule refresh
          this.refreshManager.scheduleRefresh(serverUrl, token)
          return { status: "authorized", tokens: token }
        }
      }

      // If we get here with REDIRECT, the flow didn't complete
      return {
        status: "error",
        error: "OAuth flow did not complete",
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`OAuth flow failed for ${provider}:`, message)

      return {
        status: "error",
        error: message,
        code: (error as { code?: string }).code,
      }
    } finally {
      oauthProvider.cleanup()
    }
  }

  /**
   * Handle 401 response from MCP server
   * Tries to refresh token, returns true if successful
   */
  async handleUnauthorized(
    serverUrl: string,
    response?: Response
  ): Promise<boolean> {
    // Parse error details if available
    if (response) {
      const wwwAuth = parseWWWAuthenticate(
        response.headers.get("WWW-Authenticate")
      )
      const errorType = categorizeOAuthError(wwwAuth.error)

      switch (errorType) {
        case "invalid_token":
          // Token expired - try refresh
          break
        case "invalid_grant":
          // Refresh token revoked - need full re-auth
          await this.tokenStore.delete(serverUrl)
          return false
        case "access_denied":
          // User revoked access - need full re-auth
          await this.tokenStore.delete(serverUrl)
          return false
        case "insufficient_scope":
          // Need different scopes - need full re-auth
          await this.tokenStore.delete(serverUrl)
          return false
      }
    }

    // Try to refresh
    const refreshed = await this.refreshManager.handleUnauthorized(serverUrl)
    return refreshed !== null
  }

  /**
   * Disconnect from a server (revoke/delete tokens)
   */
  async disconnect(serverUrl: string): Promise<void> {
    await this.tokenStore.delete(serverUrl)
    log.info(`Disconnected OAuth for ${detectProvider(serverUrl)}`)
  }

  /**
   * List all connected OAuth providers
   */
  async listConnections(): Promise<
    Array<{ serverUrl: string; provider: string; expiresAt?: number }>
  > {
    return this.tokenStore.list()
  }

  /**
   * Shutdown the OAuth manager
   */
  shutdown(): void {
    this.refreshManager.stopAll()
    this.initialized = false
    log.info("OAuth manager shutdown")
  }
}

/**
 * Create and initialize an OAuth manager
 */
export async function createOAuthManager(
  keySource?: KeySource
): Promise<OAuthManager> {
  // Determine key source
  let source: KeySource = keySource ?? { type: "memory" }

  if (!keySource) {
    // Try keychain first
    if (await isKeychainAvailable()) {
      source = { type: "keychain" }
      log.debug("Using OS keychain for token encryption")
    } else {
      log.warn(
        "OS keychain not available - using in-memory storage (tokens won't persist)"
      )
    }
  }

  const tokenStore = await createTokenStore(source)
  const manager = new OAuthManager(tokenStore)
  await manager.initialize()

  return manager
}
