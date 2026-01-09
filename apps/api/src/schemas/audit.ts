import { z } from "zod"

export const auditActions = [
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "mcp_server.created",
  "mcp_server.updated",
  "mcp_server.deleted",
  "member.invited",
  "member.joined",
  "member.removed",
  "member.role_changed",
  "api_key.created",
  "api_key.revoked",
] as const

export const targetTypes = [
  "organization",
  "mcp_server",
  "member",
  "invitation",
  "api_key",
] as const

export const listAuditQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  action: z.enum(auditActions).optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

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

export type AuditAction = (typeof auditActions)[number]
export type TargetType = (typeof targetTypes)[number]
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>
export type CreateAuditInput = z.infer<typeof createAuditSchema>
