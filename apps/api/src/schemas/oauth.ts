/**
 * OAuth validation schemas
 *
 * Zod schemas for OAuth API routes.
 */

import { z } from "zod"

// =============================================================================
// Constants
// =============================================================================

/**
 * Known OAuth providers for display purposes
 */
export const oauthProviders = ["sentry", "github", "linear", "other"] as const

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * POST /api/oauth/connect - Initiate OAuth flow
 */
export const connectOAuthSchema = z.object({
  serverUrl: z.string().url("Invalid server URL"),
  provider: z.string().optional(),
})

/**
 * POST /api/oauth/token - Get token for gateway
 * Using POST with body for security (not GET with query params)
 */
export const getTokenSchema = z.object({
  serverUrl: z.string().url("Invalid server URL"),
})

/**
 * DELETE /api/oauth/token - Disconnect/revoke token
 */
export const deleteTokenQuerySchema = z.object({
  serverUrl: z.string().min(1, "Server URL is required"),
})

// =============================================================================
// Response Types
// =============================================================================

/**
 * OAuth connection info (without sensitive tokens)
 */
export const oauthConnectionSchema = z.object({
  provider: z.string(),
  serverUrl: z.string(),
  scope: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// =============================================================================
// Type Exports
// =============================================================================

export type OAuthProvider = (typeof oauthProviders)[number]
export type ConnectOAuthInput = z.infer<typeof connectOAuthSchema>
export type GetTokenInput = z.infer<typeof getTokenSchema>
export type DeleteTokenQuery = z.infer<typeof deleteTokenQuerySchema>
export type OAuthConnection = z.infer<typeof oauthConnectionSchema>
