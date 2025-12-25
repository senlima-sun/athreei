/**
 * Background Script Type Definitions
 *
 * Types specific to the extension background script that aren't
 * shared across packages
 */

import type { PermissionLevel } from "@athreei/shared"

// ============================================================================
// Permission Check Result
// ============================================================================

export interface PermissionCheckResult {
  allowed: boolean
  level: PermissionLevel
  reason?: string
}

// ============================================================================
// Tab Info
// ============================================================================

export interface TabInfo {
  id: number
  url: string
  origin: string
  title: string
}

// ============================================================================
// Permission Error
// ============================================================================

export class PermissionDeniedError extends Error {
  constructor(
    public origin: string,
    public tool: string,
    public level: PermissionLevel
  ) {
    super(`Permission denied for ${tool} on ${origin} (level: ${level})`)
    this.name = "PermissionDeniedError"
  }
}

export class PermissionPromptRequiredError extends Error {
  constructor(
    public origin: string,
    public tool: string
  ) {
    super(`User prompt required for ${tool} on ${origin}`)
    this.name = "PermissionPromptRequiredError"
  }
}
