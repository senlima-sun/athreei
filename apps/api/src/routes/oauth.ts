/**
 * OAuth routes
 *
 * API routes for MCP OAuth 2.1 authentication flows.
 * Enables browser-based authorization for MCP servers that support OAuth.
 *
 * Security Notes:
 * - All token operations use POST with body (not GET with query) to prevent log exposure
 * - Tokens are encrypted at rest using AES-256-GCM
 * - PKCE is used for all OAuth flows
 * - State parameter prevents CSRF attacks
 * - Sessions expire after 5 minutes
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { oauthSession, oauthToken } from "@athreei/db"
import {
  encryptEnv,
  decryptEnv,
  getCurrentKeyVersion,
  isEncryptionConfigured,
} from "../lib/encryption"

// Schemas
import {
  connectOAuthSchema,
  getTokenSchema,
  deleteTokenQuerySchema,
} from "../schemas/oauth"

// Services
import { generateUUID, logAuditEvent } from "../services"

const oauth = new Hono()

// =============================================================================
// Constants
// =============================================================================

const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // Refresh if expiring in 5 minutes

// Platform URL for OAuth callbacks
const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:3001"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Detect OAuth provider from server URL
 */
function detectProvider(serverUrl: string): string {
  const url = serverUrl.toLowerCase()
  if (url.includes("sentry")) return "sentry"
  if (url.includes("github")) return "github"
  if (url.includes("linear")) return "linear"
  return "other"
}

/**
 * Generate PKCE code verifier (43-128 chars, URL-safe)
 */
function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Generate PKCE code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return base64UrlEncode(new Uint8Array(hash))
}

/**
 * URL-safe base64 encoding
 */
function base64UrlEncode(bytes: Uint8Array): string {
  // Convert Uint8Array to base64
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
  const base64 = btoa(binString)
  // Make URL-safe
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * OAuth metadata response from discovery
 */
interface OAuthMetadataResponse {
  authorization_endpoint?: string
  token_endpoint?: string
  registration_endpoint?: string
}

/**
 * OAuth token response from token endpoint
 */
interface OAuthTokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * Discover OAuth metadata from an MCP server
 * Follows RFC 8414 and MCP spec for OAuth discovery
 */
async function discoverOAuthMetadata(serverUrl: string): Promise<{
  authorizationEndpoint: string
  tokenEndpoint: string
  registrationEndpoint?: string
}> {
  const baseUrl = new URL(serverUrl)
  baseUrl.pathname = ""

  // Try well-known endpoint first (RFC 8414)
  const metadataUrl = new URL(
    "/.well-known/oauth-authorization-server",
    baseUrl
  )

  try {
    const response = await fetch(metadataUrl.toString(), {
      headers: { Accept: "application/json" },
    })

    if (response.ok) {
      const metadata = (await response.json()) as OAuthMetadataResponse
      return {
        authorizationEndpoint:
          metadata.authorization_endpoint ||
          new URL("/authorize", baseUrl).toString(),
        tokenEndpoint:
          metadata.token_endpoint || new URL("/token", baseUrl).toString(),
        registrationEndpoint: metadata.registration_endpoint,
      }
    }
  } catch {
    // Discovery failed, use fallback
  }

  // Fallback to MCP spec defaults
  return {
    authorizationEndpoint: new URL("/authorize", baseUrl).toString(),
    tokenEndpoint: new URL("/token", baseUrl).toString(),
    registrationEndpoint: new URL("/register", baseUrl).toString(),
  }
}

/**
 * Get or register client ID for an MCP server
 * @param serverUrl - The MCP server URL
 * @param _registrationEndpoint - Reserved for future dynamic client registration (RFC 7591)
 */
async function getClientId(
  serverUrl: string,
  _registrationEndpoint?: string
): Promise<string> {
  // For known providers, use pre-registered client IDs
  const provider = detectProvider(serverUrl)

  // Check environment for provider-specific client IDs
  const envKey = `OAUTH_CLIENT_ID_${provider.toUpperCase()}`
  const clientId = process.env[envKey]
  if (clientId) {
    return clientId
  }

  // Fallback client ID (should be configured in production)
  const fallbackClientId = process.env.OAUTH_CLIENT_ID || "athreei-gateway"

  // TODO: Implement dynamic client registration if _registrationEndpoint is available
  // This would use RFC 7591 Dynamic Client Registration

  return fallbackClientId
}

/**
 * Log OAuth audit event
 */
function logOAuthEvent(
  eventType:
    | "auth_start"
    | "auth_complete"
    | "token_refresh"
    | "token_revoke"
    | "auth_error",
  params: {
    provider: string
    serverUrl: string
    userId: string
    errorCode?: string
  }
): void {
  logAuditEvent({
    event: "env_access", // Reusing env_access event type for OAuth
    timestamp: new Date().toISOString(),
    userId: params.userId,
    serverId: params.serverUrl,
    organizationId: "oauth",
    success: eventType !== "auth_error",
    reason: eventType + (params.errorCode ? `: ${params.errorCode}` : ""),
  })
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/oauth/connect
 * Initiate OAuth flow for an MCP server
 *
 * Returns an authorization URL that the client should redirect to.
 * The OAuth session state is stored in the database for callback validation.
 */
oauth.post(
  "/connect",
  authMiddleware,
  zValidator("json", connectOAuthSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const { serverUrl, provider } = c.req.valid("json")

    // Verify encryption is configured
    if (!isEncryptionConfigured()) {
      throw ApiError.badRequest(
        "OAuth is not available: encryption is not configured"
      )
    }

    // Discover OAuth endpoints
    const metadata = await discoverOAuthMetadata(serverUrl)

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Generate state (CSRF protection)
    const state = generateUUID()

    // Build redirect URI
    const redirectUri = `${PLATFORM_URL}/api/oauth/callback`

    // Get client ID
    const clientId = await getClientId(serverUrl, metadata.registrationEndpoint)

    // Store session in database
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

    // Encrypt the code verifier
    const encryptedCodeVerifier = encryptEnv({ codeVerifier })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).insert(oauthSession).values({
      id: state,
      userId: auth.userId,
      provider: provider || detectProvider(serverUrl),
      serverUrl,
      encryptedCodeVerifier,
      redirectUri,
      createdAt: now,
      expiresAt,
    })

    // Build authorization URL
    const authUrl = new URL(metadata.authorizationEndpoint)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("code_challenge", codeChallenge)
    authUrl.searchParams.set("code_challenge_method", "S256")
    authUrl.searchParams.set("state", state)

    // Log the OAuth start event
    logOAuthEvent("auth_start", {
      provider: provider || detectProvider(serverUrl),
      serverUrl,
      userId: auth.userId,
    })

    return c.json({
      authUrl: authUrl.toString(),
      expiresAt: expiresAt.toISOString(),
    })
  }
)

/**
 * GET /api/oauth/callback
 * OAuth callback handler
 *
 * Validates the state, exchanges the code for tokens, and stores them encrypted.
 * Redirects to the dashboard with success/error status.
 */
oauth.get("/callback", async (c) => {
  const db = getDb()
  const code = c.req.query("code")
  const state = c.req.query("state")
  const error = c.req.query("error")
  const errorDescription = c.req.query("error_description")

  // Handle provider errors
  if (error) {
    const errorMsg = errorDescription || error
    return c.redirect(`/dashboard?oauth_error=${encodeURIComponent(errorMsg)}`)
  }

  // Validate required parameters
  if (!code || !state) {
    return c.redirect("/dashboard?oauth_error=missing_params")
  }

  // Look up session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await (db as any).query.oauthSession.findFirst({
    where: eq(oauthSession.id, state),
  })

  if (!session) {
    return c.redirect("/dashboard?oauth_error=invalid_state")
  }

  // Check session expiry
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).delete(oauthSession).where(eq(oauthSession.id, state))
    return c.redirect("/dashboard?oauth_error=session_expired")
  }

  try {
    // Discover OAuth endpoints for token exchange
    const metadata = await discoverOAuthMetadata(session.serverUrl)

    // Decrypt code verifier
    const decryptedData = decryptEnv(session.encryptedCodeVerifier)
    const codeVerifier = decryptedData.codeVerifier

    // Get client ID
    const clientId = await getClientId(
      session.serverUrl,
      metadata.registrationEndpoint
    )

    // Exchange code for tokens
    const tokenResponse = await fetch(metadata.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: session.redirectUri,
        client_id: clientId,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error("Token exchange failed:", tokenResponse.status, errorBody)

      logOAuthEvent("auth_error", {
        provider: session.provider,
        serverUrl: session.serverUrl,
        userId: session.userId,
        errorCode: "token_exchange_failed",
      })

      return c.redirect("/dashboard?oauth_error=token_exchange_failed")
    }

    const tokens = (await tokenResponse.json()) as OAuthTokenResponse

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    // Encrypt tokens for storage
    const encryptedAccessToken = encryptEnv({ token: tokens.access_token })
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptEnv({ token: tokens.refresh_token })
      : null

    const tokenId = generateUUID()
    const now = new Date()

    // Upsert token (one token per user per server)
    // First, try to find existing token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingToken = await (db as any).query.oauthToken.findFirst({
      where: and(
        eq(oauthToken.userId, session.userId),
        eq(oauthToken.serverUrl, session.serverUrl)
      ),
    })

    if (existingToken) {
      // Update existing token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .update(oauthToken)
        .set({
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          scope: tokens.scope || null,
          keyVersion: getCurrentKeyVersion(),
          updatedAt: now,
        })
        .where(eq(oauthToken.id, existingToken.id))
    } else {
      // Insert new token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(oauthToken).values({
        id: tokenId,
        userId: session.userId,
        provider: session.provider,
        serverUrl: session.serverUrl,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
        scope: tokens.scope || null,
        keyVersion: getCurrentKeyVersion(),
        createdAt: now,
        updatedAt: now,
      })
    }

    // Clean up session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).delete(oauthSession).where(eq(oauthSession.id, state))

    // Log success
    logOAuthEvent("auth_complete", {
      provider: session.provider,
      serverUrl: session.serverUrl,
      userId: session.userId,
    })

    return c.redirect(
      `/dashboard?oauth_success=${encodeURIComponent(session.provider)}`
    )
  } catch (err) {
    console.error("OAuth callback error:", err)

    logOAuthEvent("auth_error", {
      provider: session.provider,
      serverUrl: session.serverUrl,
      userId: session.userId,
      errorCode: "callback_error",
    })

    // Clean up session on error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).delete(oauthSession).where(eq(oauthSession.id, state))

    return c.redirect("/dashboard?oauth_error=callback_error")
  }
})

/**
 * POST /api/oauth/token
 * Get decrypted access token for a server URL
 *
 * Used by gateway-cloud to fetch tokens for MCP server authentication.
 * Performs proactive token refresh if expiring soon.
 */
oauth.post(
  "/token",
  authMiddleware,
  zValidator("json", getTokenSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const { serverUrl } = c.req.valid("json")

    // Find token for this user and server
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await (db as any).query.oauthToken.findFirst({
      where: and(
        eq(oauthToken.userId, auth.userId),
        eq(oauthToken.serverUrl, serverUrl)
      ),
    })

    if (!token) {
      throw ApiError.notFound("No OAuth token found for this server")
    }

    // Check if token needs refresh
    const needsRefresh =
      token.expiresAt &&
      new Date(token.expiresAt).getTime() - Date.now() <
        TOKEN_REFRESH_THRESHOLD_MS

    if (needsRefresh && token.encryptedRefreshToken) {
      // Attempt proactive refresh
      try {
        const refreshedToken = await refreshToken(db, token, auth.userId)
        if (refreshedToken) {
          return c.json({
            accessToken: refreshedToken.accessToken,
            expiresAt: refreshedToken.expiresAt?.toISOString(),
            refreshed: true,
          })
        }
      } catch (err) {
        console.error("Proactive token refresh failed:", err)
        // Fall through to return current token
      }
    }

    // Decrypt and return current token
    const decryptedData = decryptEnv(token.encryptedAccessToken)
    const accessToken = decryptedData.token

    return c.json({
      accessToken,
      expiresAt: token.expiresAt?.toISOString() || null,
      refreshed: false,
    })
  }
)

/**
 * Refresh an OAuth token
 */
async function refreshToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  token: {
    id: string
    serverUrl: string
    provider: string
    encryptedRefreshToken: string | null
  },
  userId: string
): Promise<{ accessToken: string; expiresAt: Date | null } | null> {
  if (!token.encryptedRefreshToken) {
    return null
  }

  const metadata = await discoverOAuthMetadata(token.serverUrl)
  const clientId = await getClientId(
    token.serverUrl,
    metadata.registrationEndpoint
  )

  // Decrypt refresh token
  const decryptedData = decryptEnv(token.encryptedRefreshToken)
  const refreshTokenValue = decryptedData.token

  // Request new tokens
  const response = await fetch(metadata.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
      client_id: clientId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const tokens = (await response.json()) as OAuthTokenResponse

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null

  const encryptedAccessToken = encryptEnv({ token: tokens.access_token })
  const encryptedRefreshToken = tokens.refresh_token
    ? encryptEnv({ token: tokens.refresh_token })
    : token.encryptedRefreshToken // Keep old refresh token if not rotated

  // Update token in database
  await db
    .update(oauthToken)
    .set({
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      scope: tokens.scope ?? null,
      keyVersion: getCurrentKeyVersion(),
      updatedAt: new Date(),
    })
    .where(eq(oauthToken.id, token.id))

  // Log refresh event
  logOAuthEvent("token_refresh", {
    provider: token.provider,
    serverUrl: token.serverUrl,
    userId,
  })

  return {
    accessToken: tokens.access_token,
    expiresAt,
  }
}

/**
 * DELETE /api/oauth/token
 * Disconnect/revoke an OAuth token
 */
oauth.delete(
  "/token",
  authMiddleware,
  zValidator("query", deleteTokenQuerySchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const { serverUrl } = c.req.valid("query")

    // Find and delete token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await (db as any).query.oauthToken.findFirst({
      where: and(
        eq(oauthToken.userId, auth.userId),
        eq(oauthToken.serverUrl, serverUrl)
      ),
    })

    if (!token) {
      throw ApiError.notFound("No OAuth token found for this server")
    }

    // Delete the token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).delete(oauthToken).where(eq(oauthToken.id, token.id))

    // Log revocation
    logOAuthEvent("token_revoke", {
      provider: token.provider,
      serverUrl: token.serverUrl,
      userId: auth.userId,
    })

    return c.json({ success: true })
  }
)

/**
 * GET /api/oauth/connections
 * List all OAuth connections for the authenticated user
 *
 * Returns connection metadata without actual tokens.
 */
oauth.get("/connections", authMiddleware, async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)

  // Fetch all tokens for this user (without encrypted token data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens = await (db as any).query.oauthToken.findMany({
    where: eq(oauthToken.userId, auth.userId),
    columns: {
      provider: true,
      serverUrl: true,
      scope: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Map to connection response format
  const connections = tokens.map(
    (token: {
      provider: string
      serverUrl: string
      scope: string | null
      expiresAt: Date | null
      createdAt: Date
      updatedAt: Date
    }) => ({
      provider: token.provider,
      serverUrl: token.serverUrl,
      scope: token.scope,
      expiresAt: token.expiresAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
      updatedAt: token.updatedAt.toISOString(),
    })
  )

  return c.json({ connections })
})

export default oauth
