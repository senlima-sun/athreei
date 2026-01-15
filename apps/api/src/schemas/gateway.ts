import { z } from "zod"

export const getConfigQuerySchema = z.object({
  endpoint: z.string().min(1, "Endpoint name is required"),
})

export const postTracesSchema = z.object({
  traces: z.array(
    z.object({
      traceId: z.string(),
      aggregatedToolName: z.string(),
      serverName: z.string(),
      toolName: z.string(),
      arguments: z.unknown().optional(),
      result: z.unknown().optional(),
      error: z.string().optional(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().optional(),
      durationMs: z.number().optional(),
      activeSkillIds: z.array(z.string()).optional(),
      activeRuleIds: z.array(z.string()).optional(),
    })
  ),
})

export type GetConfigQuery = z.infer<typeof getConfigQuerySchema>
export type PostTracesInput = z.infer<typeof postTracesSchema>
export type TraceInput = PostTracesInput["traces"][number]
