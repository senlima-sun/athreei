/**
 * ID Generator service
 *
 * Centralized ID generation functions for various resource types.
 * All IDs use crypto.randomUUID() for cryptographic uniqueness.
 */

/**
 * Resource type prefixes for ID generation.
 * Each prefix follows the pattern: {type}_ + UUID (no hyphens)
 */
export const ID_PREFIXES = {
  namespace: "ns_",
  namespaceResource: "nsr_",
  endpoint: "ep_",
  trace: "tr_",
  apiKey: "ak_",
  cliAuthSession: "cas_",
} as const

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]

/**
 * Generate a unique ID with an optional prefix.
 *
 * @param prefix - Optional prefix for the ID (e.g., "ns_", "ep_")
 * @returns A unique ID string
 *
 * @example
 * ```typescript
 * generateId()           // "a1b2c3d4e5f6..."
 * generateId("ns_")      // "ns_a1b2c3d4e5f6..."
 * generateId(ID_PREFIXES.trace)  // "tr_a1b2c3d4e5f6..."
 * ```
 */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  return prefix ? `${prefix}${uuid}` : uuid
}

/**
 * Generate a plain UUID without hyphens.
 *
 * Used for resources that don't need a prefix (e.g., MCP servers).
 *
 * @returns A UUID string without hyphens
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Generate a namespace ID with the "ns_" prefix.
 *
 * @returns A unique namespace ID
 */
export function generateNamespaceId(): string {
  return generateId(ID_PREFIXES.namespace)
}

/**
 * Generate a namespace resource mapping ID with the "nsr_" prefix.
 *
 * @returns A unique namespace resource ID
 */
export function generateNamespaceResourceId(): string {
  return generateId(ID_PREFIXES.namespaceResource)
}

/**
 * Generate an endpoint ID with the "ep_" prefix.
 *
 * @returns A unique endpoint ID
 */
export function generateEndpointId(): string {
  return generateId(ID_PREFIXES.endpoint)
}

/**
 * Generate a trace ID with the "tr_" prefix.
 *
 * @returns A unique trace ID
 */
export function generateTraceId(): string {
  return generateId(ID_PREFIXES.trace)
}

/**
 * Generate a span ID (16-character hex string).
 *
 * Used for tracing spans in distributed systems.
 *
 * @returns A 16-character span ID
 */
export function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}

/**
 * Generate a URL-safe slug from a name.
 *
 * Converts the name to lowercase, replaces non-alphanumeric characters
 * with hyphens, and trims leading/trailing hyphens.
 *
 * @param name - The name to convert to a slug
 * @param maxLength - Maximum length of the slug (default: 50)
 * @returns A URL-safe slug string
 *
 * @example
 * ```typescript
 * generateSlug("My Test Namespace")  // "my-test-namespace"
 * generateSlug("Hello World!", 10)   // "hello-worl"
 * generateSlug("  Spaces  ")         // "spaces"
 * ```
 */
export function generateSlug(name: string, maxLength = 50): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
}
