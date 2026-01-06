/**
 * OAuth Client Provider Implementation
 *
 * Implements the MCP SDK's OAuthClientProvider interface for athreei gateway.
 * Handles the browser-based OAuth flow with PKCE for MCP servers.
 */

import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js"
import type {
  OAuthClientMetadata,
  OAuthTokens,
  OAuthClientInformation,
} from "@modelcontextprotocol/sdk/shared/auth.js"
import type { EncryptedTokenStore } from "./token-store.js"
import type { StoredTokenData, OAuthSession } from "./types.js"
import { startCallbackServer, type CallbackServer } from "./callback-server.js"
import { log } from "../logger.js"

/**
 * Athreei OAuth Client Provider
 *
 * Implements OAuthClientProvider for browser-based authorization code flow with PKCE.
 */
export class AthreeiOAuthProvider implements OAuthClientProvider {
  private serverUrl: string
  private tokenStore: EncryptedTokenStore
  private provider: string

  private callbackServer: CallbackServer | null = null
  private currentCodeVerifier: string | null = null
  private currentState: string | null = null
  private clientInfo: OAuthClientInformation | null = null

  constructor(
    serverUrl: string,
    tokenStore: EncryptedTokenStore,
    provider: string = "MCP Server"
  ) {
    this.serverUrl = serverUrl
    this.tokenStore = tokenStore
    this.provider = provider
  }

  /**
   * Redirect URL for OAuth callback
   * Starts callback server if not already running
   */
  get redirectUrl(): string | URL {
    if (this.callbackServer) {
      return this.callbackServer.redirectUri
    }
    // Will be set when startCallbackServer is called
    return "http://localhost:0/callback"
  }

  /**
   * OAuth client metadata
   */
  get clientMetadata(): OAuthClientMetadata {
    const redirectUri =
      this.callbackServer?.redirectUri ?? "http://localhost:0/callback"

    // The MCP SDK uses z.url() which validates URL strings, not URL objects
    return {
      redirect_uris: [redirectUri],
      client_name: "athreei-gateway",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // Public client (no secret)
    } as OAuthClientMetadata
  }

  /**
   * Generate state parameter for CSRF protection
   */
  async state(): Promise<string> {
    // Generate cryptographically random state
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    this.currentState = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")

    return this.currentState
  }

  /**
   * Get stored client information (from dynamic registration)
   */
  clientInformation(): OAuthClientInformation | undefined {
    return this.clientInfo ?? undefined
  }

  /**
   * Save client information after dynamic registration
   */
  saveClientInformation(info: OAuthClientInformation): void {
    this.clientInfo = info
    log.debug(`Saved client registration for ${this.provider}`)
  }

  /**
   * Get stored tokens
   */
  async tokens(): Promise<OAuthTokens | undefined> {
    const stored = await this.tokenStore.get(this.serverUrl)
    if (!stored) return undefined

    // Convert StoredTokenData to OAuthTokens
    return {
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
      token_type: stored.token_type,
      expires_in: stored.expiresAt
        ? Math.floor((stored.expiresAt - Date.now()) / 1000)
        : undefined,
      scope: stored.scope,
    }
  }

  /**
   * Save tokens after successful authorization
   */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const now = Date.now()

    const storedToken: StoredTokenData = {
      ...tokens,
      expiresAt: tokens.expires_in ? now + tokens.expires_in * 1000 : undefined,
      obtainedAt: now,
      provider: this.provider,
      serverUrl: this.serverUrl,
    }

    await this.tokenStore.set(this.serverUrl, storedToken)
    log.info(`Saved OAuth tokens for ${this.provider}`)
  }

  /**
   * Redirect user to authorization URL
   * Opens the URL in the default browser
   */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    log.info(`Opening browser for ${this.provider} authorization...`)

    // Dynamic import for cross-platform browser opening
    const open = await import("open").then((m) => m.default)
    await open(authorizationUrl.toString())
  }

  /**
   * Save PKCE code verifier
   */
  saveCodeVerifier(codeVerifier: string): void {
    this.currentCodeVerifier = codeVerifier
  }

  /**
   * Get PKCE code verifier
   */
  codeVerifier(): string {
    if (!this.currentCodeVerifier) {
      throw new Error("Code verifier not set - authorization flow not started")
    }
    return this.currentCodeVerifier
  }

  /**
   * Invalidate stored credentials
   */
  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier"
  ): Promise<void> {
    switch (scope) {
      case "all":
        await this.tokenStore.delete(this.serverUrl)
        this.clientInfo = null
        this.currentCodeVerifier = null
        this.currentState = null
        break
      case "tokens":
        await this.tokenStore.delete(this.serverUrl)
        break
      case "client":
        this.clientInfo = null
        break
      case "verifier":
        this.currentCodeVerifier = null
        this.currentState = null
        break
    }

    log.debug(`Invalidated ${scope} credentials for ${this.provider}`)
  }

  // --- Extended methods for athreei ---

  /**
   * Start the callback server before initiating OAuth flow
   */
  async startCallbackServer(): Promise<CallbackServer> {
    if (this.callbackServer) {
      return this.callbackServer
    }

    this.callbackServer = await startCallbackServer(this.provider)
    return this.callbackServer
  }

  /**
   * Wait for OAuth callback
   */
  async waitForCallback(
    timeout?: number
  ): Promise<{ code: string; state: string }> {
    if (!this.callbackServer) {
      throw new Error("Callback server not started")
    }

    try {
      const result = await this.callbackServer.waitForCallback(timeout)

      // Validate state
      if (result.state !== this.currentState) {
        throw new Error("State mismatch - possible CSRF attack")
      }

      return result
    } finally {
      this.cleanup()
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.callbackServer) {
      this.callbackServer.close()
      this.callbackServer = null
    }
  }

  /**
   * Get the provider display name
   */
  getProviderName(): string {
    return this.provider
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return this.serverUrl
  }
}

/**
 * Detect provider from server URL
 */
export function detectProvider(serverUrl: string): string {
  const url = new URL(serverUrl)
  const host = url.hostname.toLowerCase()

  if (host.includes("sentry")) return "Sentry"
  if (host.includes("github")) return "GitHub"
  if (host.includes("linear")) return "Linear"
  if (host.includes("notion")) return "Notion"
  if (host.includes("slack")) return "Slack"
  if (host.includes("figma")) return "Figma"

  // Extract domain name as fallback
  const parts = host.split(".")
  if (parts.length >= 2) {
    return (
      parts[parts.length - 2].charAt(0).toUpperCase() +
      parts[parts.length - 2].slice(1)
    )
  }

  return "MCP Server"
}
