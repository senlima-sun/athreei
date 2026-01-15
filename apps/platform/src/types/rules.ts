export type RuleScope = "global" | "namespace" | "endpoint"

export interface Rule {
  id: string
  organizationId: string
  name: string
  description: string | null
  content: string
  priority: number
  scope: RuleScope
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RuleFormData {
  name: string
  description: string
  content: string
  priority: number
  scope: RuleScope
  isEnabled: boolean
}

export interface CreateRuleInput {
  name: string
  description?: string
  content: string
  priority?: number
  scope?: RuleScope
  isEnabled?: boolean
}

export interface UpdateRuleInput {
  name?: string
  description?: string
  content?: string
  priority?: number
  scope?: RuleScope
  isEnabled?: boolean
}
