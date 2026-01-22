import { z } from "zod"

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  endpointId: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
