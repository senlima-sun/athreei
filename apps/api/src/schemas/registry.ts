import { z } from "zod"

export const registryQuerySchema = z.object({
  category: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  verified: z.enum(["true", "false"]).optional(),
})

export type RegistryQuery = z.infer<typeof registryQuerySchema>
