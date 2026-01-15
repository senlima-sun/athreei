import { z } from "zod"

export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000),
  priority: z.number().int().min(0).max(1000).optional().default(0),
  scope: z.enum(["global", "namespace", "endpoint"]).optional().default("namespace"),
  isEnabled: z.boolean().optional().default(true),
})

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  scope: z.enum(["global", "namespace", "endpoint"]).optional(),
  isEnabled: z.boolean().optional(),
})

export const listRulesQuerySchema = z.object({
  search: z.string().optional(),
  isEnabled: z.enum(["true", "false"]).optional(),
  scope: z.enum(["global", "namespace", "endpoint"]).optional(),
})

export const updatePrioritySchema = z.object({
  priority: z.number().int().min(0).max(1000),
})

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
export type ListRulesQuery = z.infer<typeof listRulesQuerySchema>
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>
