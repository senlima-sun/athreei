import { z } from "zod"

export const createNamespaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
})

export const updateNamespaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const addServerSchema = z.object({
  serverId: z.string().min(1, "Server ID is required"),
})

export const updateServerMappingSchema = z.object({
  enabled: z.boolean(),
})

export const addSkillSchema = z.object({
  skillId: z.string().min(1, "Skill ID is required"),
})

export const updateSkillMappingSchema = z.object({
  enabled: z.boolean(),
})

export const addRuleSchema = z.object({
  ruleId: z.string().min(1, "Rule ID is required"),
})

export const updateRuleMappingSchema = z.object({
  enabled: z.boolean(),
})

export const hookHandlerSchema = z.union([
  z.object({
    type: z.literal("skill"),
    skillRef: z.string().min(1),
  }),
  z.object({
    type: z.literal("script"),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("rule"),
    action: z.enum(["block", "allow", "ask"]),
    message: z.string().optional(),
  }),
])

export const createHookSchema = z.object({
  event: z.enum([
    "PreToolUse",
    "PostToolUse",
    "SessionStart",
    "SessionEnd",
    "Stop",
  ]),
  toolNamePattern: z.string().optional(),
  handler: hookHandlerSchema,
  priority: z.number().int().min(0).max(1000).default(100),
  isEnabled: z.boolean().default(true),
})

export const updateHookSchema = z.object({
  event: z
    .enum(["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd", "Stop"])
    .optional(),
  toolNamePattern: z.string().nullable().optional(),
  handler: hookHandlerSchema.optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isEnabled: z.boolean().optional(),
})

export type CreateNamespaceInput = z.infer<typeof createNamespaceSchema>
export type UpdateNamespaceInput = z.infer<typeof updateNamespaceSchema>
export type AddServerInput = z.infer<typeof addServerSchema>
export type UpdateServerMappingInput = z.infer<typeof updateServerMappingSchema>
export type AddSkillInput = z.infer<typeof addSkillSchema>
export type UpdateSkillMappingInput = z.infer<typeof updateSkillMappingSchema>
export type AddRuleInput = z.infer<typeof addRuleSchema>
export type UpdateRuleMappingInput = z.infer<typeof updateRuleMappingSchema>
export type CreateHookInput = z.infer<typeof createHookSchema>
export type UpdateHookInput = z.infer<typeof updateHookSchema>
