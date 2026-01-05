/**
 * Tools validation schemas
 *
 * Zod schemas for MCP tool configuration.
 */

import { z } from "zod"

// =============================================================================
// Schemas
// =============================================================================

export const listToolsQuerySchema = z.object({
  serverId: z.string().min(1, "serverId is required"),
})

export const updateToolSchema = z.object({
  customDescription: z.string().max(2000).nullable().optional(),
  customPrompt: z.string().max(5000).nullable().optional(),
  isEnabled: z.boolean().optional(),
})

// =============================================================================
// Type Exports
// =============================================================================

export type ListToolsQuery = z.infer<typeof listToolsQuerySchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>
