/**
 * @athreei/shared/utils - Shared utility functions
 */

// Re-export redaction utilities
export {
  SENSITIVE_PATTERNS,
  redact,
  redactObject,
  createSecureLogger,
  type Logger,
} from "./redact.js"
