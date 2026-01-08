/**
 * Organization validation schemas
 *
 * Zod schemas for organization management.
 */

import { z } from "zod"

// =============================================================================
// Constants
// =============================================================================

export const memberRoles = ["admin", "member"] as const

// =============================================================================
// Schemas
// =============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  logo: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logo: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(memberRoles).default("member"),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(memberRoles),
})

// =============================================================================
// Type Exports
// =============================================================================

export type MemberRole = (typeof memberRoles)[number]
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
