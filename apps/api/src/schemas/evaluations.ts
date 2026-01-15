import { z } from "zod"

export const createEvaluationSchema = z.object({
  traceId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).nullable().optional(),
  activeSkillIds: z.array(z.string()).optional(),
  activeRuleIds: z.array(z.string()).optional(),
})

export const listEvaluationsQuerySchema = z.object({
  traceId: z.string().optional(),
  skillId: z.string().optional(),
  ruleId: z.string().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  skillId: z.string().optional(),
  ruleId: z.string().optional(),
})

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>
export type ListEvaluationsQuery = z.infer<typeof listEvaluationsQuerySchema>
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
