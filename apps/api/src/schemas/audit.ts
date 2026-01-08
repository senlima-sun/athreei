/**
 * Audit validation schemas
 *
 * Zod schemas for audit log operations.
 */

import { z } from "zod"

// =============================================================================
// Constants
// =============================================================================

/**
 * Audit action types
 */
export const auditActions = [
  // Organization events
  "organization.created",
  "organization.updated",
  "organization.deleted",
  // MCP server events
  "mcp_server.created",
  "mcp_server.updated",
  "mcp_server.deleted",
  // Member events
  "member.invited",
  "member.joined",
  "member.removed",
  "member.role_changed",
  // API key events
  "api_key.created",
  "api_key.revoked",
] as const

/**
 * Target types for audit events
 */
export const targetTypes = [
  "organization",
  "mcp_server",
  "member",
  "invitation",
  "api_key",
] as const

// =============================================================================
// Schemas
// =============================================================================

/**
 * Query schema for listing audit logs
 */
export const listAuditQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  action: z.enum(auditActions).optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

/**
 * Schema for creating an audit log entry
 */
export const createAuditSchema = z.object({
  action: z.enum(auditActions, {
    errorMap: () => ({ message: "Invalid audit action" }),
  }),
  targetType: z.enum(targetTypes, {
    errorMap: () => ({ message: "Invalid target type" }),
  }),
  targetId: z.string().min(1, "Target ID is required"),
  metadata: z.record(z.unknown()).optional(),
})

// =============================================================================
// Type Exports
// =============================================================================

export type AuditAction = (typeof auditActions)[number]
export type TargetType = (typeof targetTypes)[number]
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>
export type CreateAuditInput = z.infer<typeof createAuditSchema>
