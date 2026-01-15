/**
 * Skills and Rules Zod Schemas
 *
 * Validation schemas for AI configuration management.
 */

import { z } from "zod"

/**
 * Rule scope enum
 */
export const ruleScopeSchema = z.enum(["global", "namespace", "endpoint"])

/**
 * Create skill input schema
 */
export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isEnabled: z.boolean().optional().default(true),
})

/**
 * Update skill input schema
 */
export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isEnabled: z.boolean().optional(),
})

/**
 * Create rule input schema
 */
export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000),
  priority: z.number().int().min(0).max(1000).optional().default(0),
  scope: ruleScopeSchema.optional().default("global"),
  isEnabled: z.boolean().optional().default(true),
})

/**
 * Update rule input schema
 */
export const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  scope: ruleScopeSchema.optional(),
  isEnabled: z.boolean().optional(),
})

/**
 * Create evaluation input schema
 */
export const createEvaluationSchema = z.object({
  traceId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).nullable().optional(),
  activeSkillIds: z.array(z.string()).optional(),
  activeRuleIds: z.array(z.string()).optional(),
})

/**
 * List evaluations query schema
 */
export const listEvaluationsQuerySchema = z.object({
  traceId: z.string().optional(),
  skillId: z.string().optional(),
  ruleId: z.string().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/**
 * Analytics query schema
 */
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  skillId: z.string().optional(),
  ruleId: z.string().optional(),
})

/**
 * Skill config schema (for gateway/local mode)
 */
export const skillConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  version: z.number().int().positive().optional(),
})

/**
 * Rule config schema (for gateway/local mode)
 */
export const ruleConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().min(1),
  priority: z.number().int().min(0).optional().default(0),
  scope: ruleScopeSchema.optional().default("global"),
})

// Type exports
export type CreateSkillInput = z.infer<typeof createSkillSchema>
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>
export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>
export type ListEvaluationsQuery = z.infer<typeof listEvaluationsQuerySchema>
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
export type SkillConfigInput = z.infer<typeof skillConfigSchema>
export type RuleConfigInput = z.infer<typeof ruleConfigSchema>
export type RuleScope = z.infer<typeof ruleScopeSchema>
