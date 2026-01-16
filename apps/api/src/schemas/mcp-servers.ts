import { z } from "zod"

export const transportTypes = ["stdio", "sse", "streamable-http"] as const
export const statusTypes = ["active", "inactive", "pending"] as const

const jsonArrayStringSchema = z
  .string()
  .max(1000)
  .refine(
    (val) => {
      try {
        const parsed = JSON.parse(val)
        return (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        )
      } catch {
        return false
      }
    },
    { message: "Args must be a valid JSON array of strings" }
  )

export const createServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  transport: z.enum(transportTypes, {
    errorMap: () => ({ message: "Invalid transport type" }),
  }),
  command: z.string().max(500).optional(),
  args: jsonArrayStringSchema.optional(),
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
  args: jsonArrayStringSchema.nullable().optional(),
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

export type TransportType = (typeof transportTypes)[number]
export type StatusType = (typeof statusTypes)[number]
export const verifyMcpServerSchema = z.object({
  serverUrl: z.string().url("Invalid server URL"),
  authToken: z.string().min(1, "Auth token is required"),
})

export const batchHealthCheckSchema = z.object({
  serverIds: z
    .array(z.string().min(1))
    .min(1, "At least one server ID required")
    .max(20, "Maximum 20 servers per batch"),
})

export const updateToolSchema = z.object({
  description: z.string().max(1000, "Description too long").optional(),
  enabled: z.boolean().optional(),
})

export type CreateServerInput = z.infer<typeof createServerSchema>
export type UpdateServerInput = z.infer<typeof updateServerSchema>
export type ListServersQuery = z.infer<typeof listQuerySchema>
export type VerifyMcpServerInput = z.infer<typeof verifyMcpServerSchema>
export type BatchHealthCheckInput = z.infer<typeof batchHealthCheckSchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>
