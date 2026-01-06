/**
 * MCP Server validation schemas
 *
 * Zod schemas for MCP server CRUD operations.
 */

import { z } from "zod"

// =============================================================================
// Constants
// =============================================================================

export const transportTypes = ["stdio", "sse", "streamable-http"] as const
export const statusTypes = ["active", "inactive", "pending"] as const

// =============================================================================
// Schemas
// =============================================================================

export const createServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  transport: z.enum(transportTypes, {
    errorMap: () => ({ message: "Invalid transport type" }),
  }),
  command: z.string().max(500).optional(),
  args: z.string().max(1000).optional(),
  url: z.string().url("Invalid URL").optional(),
  version: z.string().max(50).optional(),
  capabilities: z.string().max(5000).optional(),
  env: z.record(z.string()).optional(),
})

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  transport: z
    .enum(transportTypes, {
      errorMap: () => ({ message: "Invalid transport type" }),
    })
    .optional(),
  command: z.string().max(500).nullable().optional(),
  args: z.string().max(1000).nullable().optional(),
  url: z.string().url("Invalid URL").nullable().optional(),
  status: z
    .enum(statusTypes, {
      errorMap: () => ({ message: "Invalid status" }),
    })
    .optional(),
  version: z.string().max(50).nullable().optional(),
  capabilities: z.string().max(5000).nullable().optional(),
  env: z.record(z.string()).nullable().optional(),
})

export const listQuerySchema = z.object({
  status: z.enum(statusTypes).optional(),
  transport: z.enum(transportTypes).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  organizationId: z.string().min(1, "Organization ID is required"),
})

// =============================================================================
// Type Exports
// =============================================================================

export type TransportType = (typeof transportTypes)[number]
export type StatusType = (typeof statusTypes)[number]
export const verifyMcpServerSchema = z.object({
  serverUrl: z.string().url("Invalid server URL"),
  authToken: z.string().min(1, "Auth token is required"),
})

export type CreateServerInput = z.infer<typeof createServerSchema>
export type UpdateServerInput = z.infer<typeof updateServerSchema>
export type ListServersQuery = z.infer<typeof listQuerySchema>
export type VerifyMcpServerInput = z.infer<typeof verifyMcpServerSchema>
