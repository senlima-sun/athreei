import { logger } from "../lib/logger"

interface BaseAuditEvent {
  timestamp: string
  userId: string
}

export interface EnvAccessAuditEvent extends BaseAuditEvent {
  event: "env_access"
  serverId: string
  organizationId: string
  success: boolean
  reason?: string
}

export interface RateLimitViolationEvent extends BaseAuditEvent {
  event: "rate_limit_violation"
  endpoint: "env_access" | "gateway_config" | "gateway_traces"
  serverId?: string
  rateLimitKey: string
}

export interface ApiKeyUsageEvent extends BaseAuditEvent {
  event: "api_key_usage"
  apiKeyId: string
  endpointId: string
  action: "validate" | "create" | "revoke"
}

export interface MembershipAccessEvent extends BaseAuditEvent {
  event: "membership_access"
  organizationId: string
  granted: boolean
  resourceType?: string
  resourceId?: string
}

export type OAuthEventType =
  | "oauth_auth_start"
  | "oauth_auth_complete"
  | "oauth_auth_error"
  | "oauth_token_refresh"
  | "oauth_token_revoke"
  | "oauth_token_access"

export interface OAuthAuditEvent extends BaseAuditEvent {
  event: OAuthEventType
  provider: string
  serverUrl: string
  errorCode?: string
  tokenHash?: string
}

export type AuditEvent =
  | EnvAccessAuditEvent
  | RateLimitViolationEvent
  | ApiKeyUsageEvent
  | MembershipAccessEvent
  | OAuthAuditEvent

export function logAuditEvent(event: AuditEvent): void {
  logger.info("Audit event", { ...event })
}

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

export function logEnvAccess(params: {
  serverId: string
  userId: string
  organizationId: string
  success: boolean
  reason?: string
}): void {
  logAuditEvent(createEnvAccessEvent(params))
}

export function logRateLimitViolation(params: {
  endpoint: RateLimitViolationEvent["endpoint"]
  userId: string
  rateLimitKey: string
  serverId?: string
}): void {
  logAuditEvent(createRateLimitViolationEvent(params))
}

export async function generateTokenHash(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex.substring(0, 16)
}

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
