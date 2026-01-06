/**
 * Audit Logging service
 *
 * Structured audit logging for security-sensitive operations.
 * Logs are written to stderr as JSON for easy parsing by log aggregators.
 *
 * IMPORTANT: Never log actual credential values!
 */

/**
 * Base audit event with common fields
 */
interface BaseAuditEvent {
  /** Timestamp in ISO 8601 format */
  timestamp: string
  /** User who triggered the event */
  userId: string
}

/**
 * Environment variable access audit event
 */
export interface EnvAccessAuditEvent extends BaseAuditEvent {
  event: "env_access"
  /** MCP server ID being accessed */
  serverId: string
  /** Organization ID */
  organizationId: string
  /** Whether access was successful */
  success: boolean
  /** Reason for failure or additional context */
  reason?: string
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolationEvent extends BaseAuditEvent {
  event: "rate_limit_violation"
  /** Which endpoint was rate limited */
  endpoint: "env_access" | "gateway_config" | "gateway_traces"
  /** Resource being accessed */
  serverId?: string
  /** Rate limit key that was violated */
  rateLimitKey: string
}

/**
 * API key usage event
 */
export interface ApiKeyUsageEvent extends BaseAuditEvent {
  event: "api_key_usage"
  /** API key ID (not the actual key!) */
  apiKeyId: string
  /** Endpoint ID the key is associated with */
  endpointId: string
  /** Action performed */
  action: "validate" | "create" | "revoke"
}

/**
 * Organization membership access event
 */
export interface MembershipAccessEvent extends BaseAuditEvent {
  event: "membership_access"
  /** Organization ID being accessed */
  organizationId: string
  /** Whether access was granted */
  granted: boolean
  /** Resource type being accessed */
  resourceType?: string
  /** Resource ID being accessed */
  resourceId?: string
}

/**
 * OAuth event types for audit logging
 */
export type OAuthEventType =
  | "oauth_auth_start"
  | "oauth_auth_complete"
  | "oauth_auth_error"
  | "oauth_token_refresh"
  | "oauth_token_revoke"
  | "oauth_token_access"

/**
 * OAuth audit event
 */
export interface OAuthAuditEvent extends BaseAuditEvent {
  event: OAuthEventType
  /** OAuth provider name (e.g., sentry, github, linear) */
  provider: string
  /** MCP server URL */
  serverUrl: string
  /** Error code (for error events) */
  errorCode?: string
  /** SHA256 hash of token prefix for correlation (first 16 chars) */
  tokenHash?: string
}

/**
 * Union type of all audit events
 */
export type AuditEvent =
  | EnvAccessAuditEvent
  | RateLimitViolationEvent
  | ApiKeyUsageEvent
  | MembershipAccessEvent
  | OAuthAuditEvent

/**
 * Log an audit event to stderr as structured JSON.
 *
 * Uses console.error to ensure output goes to stderr (not stdout),
 * which is important for MCP servers where stdout is used for JSON-RPC.
 *
 * @param event - The audit event to log
 *
 * @example
 * ```typescript
 * logAuditEvent({
 *   event: "env_access",
 *   serverId: "srv_123",
 *   userId: "usr_456",
 *   organizationId: "org_789",
 *   timestamp: new Date().toISOString(),
 *   success: true,
 * })
 * ```
 */
export function logAuditEvent(event: AuditEvent): void {
  console.error(JSON.stringify(event))
}

/**
 * Create an env access audit event.
 *
 * Helper to create properly typed env access events.
 *
 * @param params - Event parameters
 * @returns A complete EnvAccessAuditEvent
 */
export function createEnvAccessEvent(params: {
  serverId: string
  userId: string
  organizationId: string
  success: boolean
  reason?: string
}): EnvAccessAuditEvent {
  return {
    event: "env_access",
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Create a rate limit violation event.
 *
 * @param params - Event parameters
 * @returns A complete RateLimitViolationEvent
 */
export function createRateLimitViolationEvent(params: {
  endpoint: RateLimitViolationEvent["endpoint"]
  userId: string
  rateLimitKey: string
  serverId?: string
}): RateLimitViolationEvent {
  return {
    event: "rate_limit_violation",
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Create an API key usage event.
 *
 * @param params - Event parameters
 * @returns A complete ApiKeyUsageEvent
 */
export function createApiKeyUsageEvent(params: {
  userId: string
  apiKeyId: string
  endpointId: string
  action: ApiKeyUsageEvent["action"]
}): ApiKeyUsageEvent {
  return {
    event: "api_key_usage",
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Create a membership access event.
 *
 * @param params - Event parameters
 * @returns A complete MembershipAccessEvent
 */
export function createMembershipAccessEvent(params: {
  userId: string
  organizationId: string
  granted: boolean
  resourceType?: string
  resourceId?: string
}): MembershipAccessEvent {
  return {
    event: "membership_access",
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Log an env access event with a single function call.
 *
 * Convenience function that combines creation and logging.
 *
 * @param params - Event parameters
 */
export function logEnvAccess(params: {
  serverId: string
  userId: string
  organizationId: string
  success: boolean
  reason?: string
}): void {
  logAuditEvent(createEnvAccessEvent(params))
}

/**
 * Log a rate limit violation with a single function call.
 *
 * @param params - Event parameters
 */
export function logRateLimitViolation(params: {
  endpoint: RateLimitViolationEvent["endpoint"]
  userId: string
  rateLimitKey: string
  serverId?: string
}): void {
  logAuditEvent(createRateLimitViolationEvent(params))
}

/**
 * Generate a token hash for audit correlation.
 *
 * Creates a SHA256 hash of the token and returns the first 16 characters.
 * This allows correlating events without exposing actual tokens.
 *
 * @param token - The actual token value (will NOT be logged)
 * @returns First 16 characters of SHA256 hash
 */
export async function generateTokenHash(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex.substring(0, 16)
}

/**
 * Create an OAuth audit event.
 *
 * Helper to create properly typed OAuth events.
 *
 * @param eventType - The specific OAuth event type
 * @param params - Event parameters
 * @returns A complete OAuthAuditEvent
 */
export function createOAuthEvent(
  eventType: OAuthEventType,
  params: {
    provider: string
    serverUrl: string
    userId: string
    errorCode?: string
    tokenHash?: string
  }
): OAuthAuditEvent {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    provider: params.provider,
    serverUrl: params.serverUrl,
    ...(params.errorCode && { errorCode: params.errorCode }),
    ...(params.tokenHash && { tokenHash: params.tokenHash }),
  }
}

/**
 * Log an OAuth audit event with a single function call.
 *
 * Convenience function that combines creation and logging.
 *
 * @param eventType - The specific OAuth event type
 * @param params - Event parameters
 */
export function logOAuthEvent(
  eventType: OAuthEventType,
  params: {
    provider: string
    serverUrl: string
    userId: string
    errorCode?: string
    tokenHash?: string
  }
): void {
  logAuditEvent(createOAuthEvent(eventType, params))
}
