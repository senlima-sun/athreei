import { z } from "zod"

export const authTypes = ["api_key", "bearer", "none"] as const
export const endpointStatusTypes = ["active", "inactive", "deprecated"] as const

export const createEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  namespaceId: z.string().min(1, "Namespace ID is required"),
  authType: z.enum(authTypes).default("api_key"),
  rateLimit: z.number().int().positive().optional(),
})

export const updateEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  authType: z.enum(authTypes).optional(),
  rateLimit: z.number().int().positive().nullable().optional(),
  status: z.enum(endpointStatusTypes).optional(),
})

export type AuthType = (typeof authTypes)[number]
export type EndpointStatusType = (typeof endpointStatusTypes)[number]
export type CreateEndpointInput = z.infer<typeof createEndpointSchema>
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>
