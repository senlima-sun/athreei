/**
 * Registry validation schemas
 *
 * Zod schemas for MCP registry browsing.
 */

import { z } from "zod"

// =============================================================================
// Schemas
// =============================================================================

export const registryQuerySchema = z.object({
  category: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  verified: z.enum(["true", "false"]).optional(),
})

// =============================================================================
// Type Exports
// =============================================================================

export type RegistryQuery = z.infer<typeof registryQuerySchema>
