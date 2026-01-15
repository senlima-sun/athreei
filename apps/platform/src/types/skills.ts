/**
 * Skill-related type definitions
 */

/**
 * Skill as returned from the API
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
  createdAt: string
  updatedAt: string
}

/**
 * Form data for creating/editing skills
 */
export interface SkillFormData {
  name: string
  description: string
  content: string
  tags: string[]
  isEnabled: boolean
}

/**
 * Input for creating a new skill
 */
export interface CreateSkillInput {
  name: string
  description?: string
  content: string
  tags?: string[]
  isEnabled?: boolean
}

/**
 * Input for updating an existing skill
 */
export interface UpdateSkillInput {
  name?: string
  description?: string
  content?: string
  tags?: string[]
  isEnabled?: boolean
}
