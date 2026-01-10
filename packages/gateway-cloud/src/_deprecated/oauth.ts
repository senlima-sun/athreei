/**
 * OAuth Token Fetching for Gateway Cloud
 *
 * Fetches OAuth tokens from the platform API for SSE/HTTP MCP servers
 * that require OAuth authentication.
 */

import type { Logger } from "@athreei/gateway-core"

/**
 * OAuth token response from platform API
 */
export interface OAuthTokenResponse {
  accessToken: string
  expiresAt?: number
}

/**
 * Options for fetching OAuth token
 */
export interface GetOAuthTokenOptions {
  /** MCP server URL */
  serverUrl: string
  /** API key for authenticating with platform API */
  apiKey: string
  /** Logger instance */
  logger?: Logger
}

/**
 * Fetch OAuth token for an MCP server from the platform API
 *
 * Makes a POST request to the platform's /api/oauth/token endpoint
 * to retrieve an OAuth access token for the specified server URL.
 *
 * @param options - Options including serverUrl and apiKey
 * @returns OAuth token data or null if no token available
 */
export async function getOAuthToken(
  options: GetOAuthTokenOptions
): Promise<OAuthTokenResponse | null> {
  const { serverUrl, apiKey, logger } = options
  const API_URL = process.env.API_URL || "http://localhost:3001"

  logger?.debug?.(`Fetching OAuth token for server: ${serverUrl}`)

  try {
    const response = await fetch(`${API_URL}/api/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serverUrl }),
    })

    if (!response.ok) {
      if (response.status === 404) {
        // No OAuth token for this server - this is expected for servers
        // that don't use OAuth or haven't been connected yet
        logger?.debug?.(`No OAuth token found for server: ${serverUrl}`)
        return null
      }

      if (response.status === 401) {
        logger?.warn?.(
          `OAuth token fetch unauthorized for server: ${serverUrl}`
        )
        return null
      }

      logger?.warn?.(
        `Failed to fetch OAuth token for ${serverUrl}: ${response.status}`
      )
      return null
    }

    const data = (await response.json()) as OAuthTokenResponse

    logger?.debug?.(`OAuth token fetched for server: ${serverUrl}`)

    return data
  } catch (error) {
    // Network errors, JSON parsing errors, etc.
    // Log but don't throw - graceful degradation
    logger?.error?.(
      `Error fetching OAuth token for ${serverUrl}:`,
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

/**
 * Build authorization headers for an MCP server connection
 *
 * Fetches OAuth token if available and returns appropriate headers.
 * Returns empty object if no OAuth token is available (server may not need auth).
 *
 * @param serverUrl - MCP server URL
 * @param apiKey - API key for platform authentication
 * @param logger - Logger instance
 * @returns Headers object with Authorization if token available
 */
export async function getAuthHeadersForServer(
  serverUrl: string,
  apiKey: string,
  logger?: Logger
): Promise<Record<string, string>> {
  const token = await getOAuthToken({ serverUrl, apiKey, logger })

  if (token) {
    return {
      Authorization: `Bearer ${token.accessToken}`,
    }
  }

  // No OAuth token - return empty headers
  // Server may not require authentication or user hasn't connected OAuth yet
  return {}
}
