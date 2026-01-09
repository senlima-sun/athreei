import { z } from "zod"

export const traceStatusTypes = ["success", "error"] as const

export const listTracesQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(traceStatusTypes).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(255).optional(),
})

export const traceIdParamSchema = z.object({
  id: z.string().min(1).max(255),
})

export type TraceStatusType = (typeof traceStatusTypes)[number]
export type ListTracesQuery = z.infer<typeof listTracesQuerySchema>
export type TraceIdParam = z.infer<typeof traceIdParamSchema>
