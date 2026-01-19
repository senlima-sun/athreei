/**
 * Token redaction utilities for OAuth security
 *
 * This module provides utilities to redact sensitive tokens from logs,
 * error messages, and data structures to prevent accidental exposure.
 *
 * @example
 * ```ts
 * import { redact, redactObject, createSecureLogger } from "@athreei/shared"
 *
 * // Redact tokens from strings
 * const safeMessage = redact("Bearer sk-abc123xyz")
 * // => "Bearer [REDACTED]"
 *
 * // Redact tokens from objects
 * const safeObj = redactObject({ access_token: "secret123" })
 * // => { access_token: "[REDACTED]" }
 *
 * // Create a secure logger wrapper
 * const secureLogger = createSecureLogger(console)
 * secureLogger.info("Token:", "sk-abc123") // Logs: "Token:" "[REDACTED]"
 * ```
 */

/**
 * Replacement string for redacted tokens
 */
const REDACTED = "[REDACTED]"

/**
 * Patterns for common token formats that should be redacted
 * Each pattern has a name for debugging and the actual regex
 */
export const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Bearer tokens in Authorization headers
  { name: "bearer", pattern: /Bearer\s+[A-Za-z0-9\-_.]+/gi },

  // Sentry tokens
  { name: "sentry-user", pattern: /sntryu_[A-Za-z0-9]+/gi },
  { name: "sentry-system", pattern: /sntrys_[A-Za-z0-9]+/gi },

  // GitHub tokens
  { name: "github-pat", pattern: /ghp_[A-Za-z0-9]+/gi },
  { name: "github-oauth", pattern: /gho_[A-Za-z0-9]+/gi },
  { name: "github-fine-grained", pattern: /github_pat_[A-Za-z0-9_]+/gi },

  // Linear tokens
  { name: "linear-api", pattern: /lin_api_[A-Za-z0-9]+/gi },

  // OpenAI-style API keys
  { name: "openai-key", pattern: /sk-[A-Za-z0-9]+/gi },

  // JSON field values for common OAuth tokens
  { name: "json-access-token", pattern: /"access_token"\s*:\s*"[^"]+"/gi },
  { name: "json-refresh-token", pattern: /"refresh_token"\s*:\s*"[^"]+"/gi },
  { name: "json-id-token", pattern: /"id_token"\s*:\s*"[^"]+"/gi },
  { name: "json-client-secret", pattern: /"client_secret"\s*:\s*"[^"]+"/gi },

  // OAuth URL parameters
  { name: "oauth-code-verifier", pattern: /code_verifier=[^&\s]+/gi },
  { name: "oauth-code", pattern: /code=[^&\s]+/gi },
  { name: "oauth-client-secret", pattern: /client_secret=[^&\s]+/gi },
  { name: "oauth-access-token", pattern: /access_token=[^&\s]+/gi },
  { name: "oauth-refresh-token", pattern: /refresh_token=[^&\s]+/gi },

  // Anthropic API keys
  { name: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9-]+/gi },

  // Generic API key patterns (be more conservative)
  { name: "api-key-param", pattern: /api_key=[^&\s]+/gi },
  { name: "apikey-param", pattern: /apikey=[^&\s]+/gi },
]

/**
 * Fields in objects that should always be redacted
 */
const SENSITIVE_FIELDS = new Set([
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "id_token",
  "idToken",
  "client_secret",
  "clientSecret",
  "code_verifier",
  "codeVerifier",
  "authorization",
  "password",
  "secret",
  "api_key",
  "apiKey",
  "token",
  "bearer",
])

/**
 * Redact sensitive tokens from a string
 *
 * Replaces any recognized token patterns with [REDACTED] to prevent
 * accidental exposure in logs, error messages, or debugging output.
 *
 * @param message - The string to redact tokens from
 * @returns The string with all sensitive tokens replaced
 *
 * @example
 * ```ts
 * redact("Got token: Bearer abc123")
 * // => "Got token: Bearer [REDACTED]"
 *
 * redact("Using key sk-test123")
 * // => "Using key [REDACTED]"
 * ```
 */
export function redact(message: string): string {
  if (!message || typeof message !== "string") {
    return message
  }

  let result = message

  for (const { pattern } of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0
    result = result.replace(pattern, (match) => {
      // For patterns like "access_token": "value", preserve the key
      if (match.includes(":")) {
        const colonIndex = match.indexOf(":")
        const key = match.substring(0, colonIndex + 1)
        return `${key} "${REDACTED}"`
      }
      // For patterns like code=value, preserve the key
      if (match.includes("=")) {
        const eqIndex = match.indexOf("=")
        const key = match.substring(0, eqIndex + 1)
        return `${key}${REDACTED}`
      }
      // For Bearer tokens, preserve "Bearer"
      if (match.toLowerCase().startsWith("bearer")) {
        return `Bearer ${REDACTED}`
      }
      return REDACTED
    })
  }

  return result
}

/**
 * Recursively redact sensitive values from an object
 *
 * Walks through all properties of an object and redacts:
 * - String values that match token patterns
 * - Values for keys that are known sensitive fields
 *
 * @param obj - The object to redact (can be any type)
 * @returns A new object with sensitive values redacted
 *
 * @example
 * ```ts
 * redactObject({
 *   access_token: "secret123",
 *   user: { name: "Alice" }
 * })
 * // => { access_token: "[REDACTED]", user: { name: "Alice" } }
 * ```
 */
export function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === "string") {
    return redact(obj)
  }

  if (typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item))
  }

  const result: Record<string, unknown> = {}
  const input = obj as Record<string, unknown>

  for (const key of Object.keys(input)) {
    const value = input[key]

    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = REDACTED
      continue
    }

    // Recursively process the value
    result[key] = redactObject(value)
  }

  return result
}

/**
 * Base logger interface for createSecureLogger
 * This is a simple interface that matches console-like loggers.
 * For the full structured logger, use Logger from @athreei/shared/logger
 */
export interface BaseLogger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  log?: (...args: unknown[]) => void
}

/**
 * Wrap a logger to automatically redact sensitive tokens
 *
 * Creates a wrapper around any logger that automatically redacts
 * sensitive tokens from all log arguments before passing them through.
 *
 * @param baseLogger - The underlying logger to wrap
 * @returns A new logger that redacts sensitive data
 *
 * @example
 * ```ts
 * const secureLogger = createSecureLogger(console)
 *
 * // Tokens are automatically redacted
 * secureLogger.info("Response:", { access_token: "secret" })
 * // Logs: "Response:" { access_token: "[REDACTED]" }
 * ```
 */
export function createSecureLogger(baseLogger: BaseLogger): BaseLogger {
  const redactArgs = (...args: unknown[]): unknown[] => {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return redact(arg)
      }
      if (typeof arg === "object" && arg !== null) {
        return redactObject(arg)
      }
      return arg
    })
  }

  return {
    debug: (...args: unknown[]) => baseLogger.debug(...redactArgs(...args)),
    info: (...args: unknown[]) => baseLogger.info(...redactArgs(...args)),
    warn: (...args: unknown[]) => baseLogger.warn(...redactArgs(...args)),
    error: (...args: unknown[]) => baseLogger.error(...redactArgs(...args)),
    log: baseLogger.log
      ? (...args: unknown[]) => baseLogger.log!(...redactArgs(...args))
      : undefined,
  }
}
