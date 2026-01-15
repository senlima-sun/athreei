import { z } from "zod"

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isEnabled: z.boolean().optional().default(true),
})

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isEnabled: z.boolean().optional(),
})

export const listSkillsQuerySchema = z.object({
  search: z.string().optional(),
  isEnabled: z.enum(["true", "false"]).optional(),
  tag: z.string().optional(),
})

export type CreateSkillInput = z.infer<typeof createSkillSchema>
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>
export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>
