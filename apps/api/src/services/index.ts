/**
 * Services barrel export
 *
 * Re-exports all shared service functions for easy importing:
 *
 * @example
 * ```typescript
 * import {
 *   verifyOrganizationMembership,
 *   generateId,
 *   validateApiKey,
 *   checkEnvRateLimit,
 *   logAuditEvent,
 *   buildEndpointUrl,
 * } from "../services"
 * ```
 */

// Organization membership verification
export {
  verifyOrganizationMembership,
  getNamespaceWithAccess,
  requireOrganizationMembership,
} from "./organization"

// ID generation utilities
export {
  ID_PREFIXES,
  type IdPrefix,
  generateId,
  generateUUID,
  generateNamespaceId,
  generateNamespaceResourceId,
  generateEndpointId,
  generateTraceId,
  generateSpanId,
  generateSlug,
} from "./id-generator"

// API key utilities
export {
  type ApiKeyValidationResult,
  generateApiKey,
  hashApiKey,
  createKeyPrefix,
  createFullKey,
  validateApiKey,
  parseAuthHeader,
} from "./api-key"

// Environment access rate limiting
export {
  ENV_RATE_LIMIT_CONFIG,
  type EnvRateLimitResult,
  checkEnvRateLimit,
  cleanupEnvRateLimiter,
  getEnvRateLimitViolations,
  resetEnvRateLimit,
  clearAllEnvRateLimits,
  setEnvRateLimitHeaders,
} from "./env-rate-limit"

// Audit logging
export {
  type EnvAccessAuditEvent,
  type RateLimitViolationEvent,
  type ApiKeyUsageEvent,
  type MembershipAccessEvent,
  type OAuthEventType,
  type OAuthAuditEvent,
  type AuditEvent,
  logAuditEvent,
  createEnvAccessEvent,
  createRateLimitViolationEvent,
  createApiKeyUsageEvent,
  createMembershipAccessEvent,
  createOAuthEvent,
  logEnvAccess,
  logRateLimitViolation,
  logOAuthEvent,
  generateTokenHash,
} from "./audit-log"

// Endpoint URL building
export {
  type ClaudeDesktopConfig,
  type GenericConnectionConfig,
  type ConnectionConfig,
  buildEndpointUrl,
  extractSlugFromUrl,
  buildConnectionConfig,
  generateConfigVersion,
  isValidEndpointUrl,
} from "./endpoint-url"
