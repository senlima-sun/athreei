/**
 * OAuth Type Definitions
 *
 * Local types extending MCP SDK OAuth types for athreei gateway.
 */

import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"

/**
 * Extended token data with metadata for local storage
 */
export interface StoredTokenData extends OAuthTokens {
  /** Absolute expiration timestamp (computed from expires_in) */
  expiresAt?: number
  /** When the token was obtained */
  obtainedAt: number
  /** Provider name for display (e.g., "sentry", "github") */
  provider: string
  /** Server URL this token is for */
  serverUrl: string
}

/**
 * OAuth session state for tracking in-progress flows
 */
export interface OAuthSession {
  /** Cryptographically random state parameter */
  state: string
  /** PKCE code verifier */
  codeVerifier: string
  /** Target MCP server URL */
  serverUrl: string
  /** Callback redirect URI */
  redirectUri: string
  /** Session creation timestamp */
  createdAt: number
  /** Session expiration timestamp (5 minutes) */
  expiresAt: number
}

/**
 * Token store format (encrypted on disk)
 */
export interface TokenStore {
  version: 1
  tokens: Record<string, StoredTokenData>
}

/**
 * Client information for dynamic registration
 */
export interface StoredClientInfo {
  clientId: string
  clientSecret?: string
  issuedAt?: number
  expiresAt?: number
}

/**
 * Client store format (encrypted on disk)
 */
export interface ClientStore {
  version: 1
  clients: Record<string, StoredClientInfo>
}

/**
 * OAuth audit event for logging
 */
export interface OAuthAuditEvent {
  eventType:
    | "auth_start"
    | "auth_complete"
    | "token_refresh"
    | "token_revoke"
    | "auth_error"
  provider: string
  serverUrl: string
  timestamp: number
  errorCode?: string
  /** Hash of token for correlation (never the actual token) */
  tokenHash?: string
}

/**
 * Result of OAuth flow initiation
 */
export type OAuthFlowResult =
  | { status: "authorized"; tokens: StoredTokenData }
  | { status: "redirect"; authUrl: string }
  | { status: "error"; error: string; code?: string }

/**
 * Callback server result
 */
export interface CallbackResult {
  code: string
  state: string
}

/**
 * Known OAuth provider configurations
 */
export interface KnownProvider {
  name: string
  displayName: string
  /** Pattern to match server URLs */
  urlPattern: RegExp
  /** Default scopes to request */
  defaultScopes?: string[]
  /** Hardcoded client ID (if provider has one for athreei) */
  clientId?: string
}

/**
 * Encryption key source
 */
export type KeySource =
  | { type: "keychain" }
  | { type: "password"; password: string }
  | { type: "memory" }
