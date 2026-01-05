/**
 * API Key validation schemas
 *
 * Zod schemas for API key management.
 */

import { z } from "zod"

// =============================================================================
// Schemas
// =============================================================================

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
})

// =============================================================================
// Type Exports
// =============================================================================

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
