/**
 * Skills and Rules Type Definitions
 *
 * Shared types for AI configuration management across packages.
 * Note: Input/Query types are defined via Zod inference in schemas/skills-rules.ts
 */

/**
 * Rule scope determines where a rule applies
 */
export type RuleScopeType = "global" | "namespace" | "endpoint"

/**
 * Skill - A markdown-based capability definition for AI
 */
export interface Skill {
  id: string
  organizationId: string
  name: string
  description: string | null
  content: string
  tags: string[]
  isEnabled: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Skill configuration for gateway/runtime use
 */
export interface SkillConfig {
  id: string
  name: string
  description?: string | null
  content: string
  tags?: string[]
  version?: number
}

/**
 * Rule - A markdown-based guideline for AI behavior
 */
export interface Rule {
  id: string
  organizationId: string
  name: string
  description: string | null
  content: string
  priority: number
  scope: RuleScopeType
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Rule configuration for gateway/runtime use
 */
export interface RuleConfig {
  id: string
  name: string
  description?: string | null
  content: string
  priority: number
  scope: RuleScopeType
}

/**
 * Evaluation - User feedback on AI interactions
 */
export interface Evaluation {
  id: string
  organizationId: string
  traceId: string
  userId: string
  rating: number
  feedback: string | null
  activeSkillIds: string[]
  activeRuleIds: string[]
  createdAt: Date
}

/**
 * Skill effectiveness metrics from evaluations
 */
export interface SkillEffectiveness {
  id: string
  name: string
  averageRating: number
  evaluationCount: number
}

/**
 * Rule effectiveness metrics from evaluations
 */
export interface RuleEffectiveness {
  id: string
  name: string
  averageRating: number
  evaluationCount: number
}

/**
 * Analytics overview response
 */
export interface AnalyticsOverview {
  totalEvaluations: number
  averageRating: number
  skillEffectiveness: SkillEffectiveness[]
  ruleEffectiveness: RuleEffectiveness[]
}
