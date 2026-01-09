import { z } from "zod"

export const createNamespaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
})

export const updateNamespaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const addServerSchema = z.object({
  serverId: z.string().min(1, "Server ID is required"),
})

export const updateServerMappingSchema = z.object({
  enabled: z.boolean(),
})

export type CreateNamespaceInput = z.infer<typeof createNamespaceSchema>
export type UpdateNamespaceInput = z.infer<typeof updateNamespaceSchema>
export type AddServerInput = z.infer<typeof addServerSchema>
export type UpdateServerMappingInput = z.infer<typeof updateServerMappingSchema>
