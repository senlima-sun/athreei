import { z } from "zod"
import {
  createMarketplaceSchema as baseCreateMarketplaceSchema,
  updateMarketplaceSchema as baseUpdateMarketplaceSchema,
  marketplaceSlugSchema,
  pluginSlugSchema,
  semverSchema,
  pluginInstallationScopeSchema,
  pluginInstallationStatusSchema,
  organizationMarketplaceSettingSchema as baseOrgMarketplaceSettingSchema,
} from "@athreei/shared"

export const listMarketplacesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  ownerType: z.enum(["system", "organization", "user"]).optional(),
  isPublic: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const createMarketplaceSchema = baseCreateMarketplaceSchema.omit({
  ownerType: true,
  ownerId: true,
})

export const updateMarketplaceSchema = baseUpdateMarketplaceSchema.omit({
  ownerType: true,
  ownerId: true,
})

export const listPluginsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  marketplaceSlug: z.string().optional(),
  category: z.string().max(50).optional(),
  tags: z.string().optional(),
  isVerified: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  isFeatured: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(["popularity", "recent", "name"]).default("popularity"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const installPluginSchema = z.object({
  marketplaceSlug: marketplaceSlugSchema,
  pluginSlug: pluginSlugSchema,
  version: semverSchema.optional(),
  scope: pluginInstallationScopeSchema.default("organization"),
  config: z.record(z.unknown()).optional(),
  envValues: z.record(z.string()).optional(),
})

export const updateInstallationSchema = z.object({
  status: pluginInstallationStatusSchema.optional(),
  config: z.record(z.unknown()).optional(),
  envValues: z.record(z.string()).optional(),
})

export const updateVersionSchema = z.object({
  version: semverSchema.optional(),
})

export const listInstallationsQuerySchema = z.object({
  status: pluginInstallationStatusSchema.optional(),
  scope: pluginInstallationScopeSchema.optional(),
  componentType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const updateOrgMarketplaceSettingsSchema = z.object({
  restrictMarketplaces: z.boolean().optional(),
  allowedMarketplaceIds: z.array(z.string()).optional(),
  restrictPlugins: z.boolean().optional(),
  allowedPluginIds: z.array(z.string()).optional(),
  defaultPluginIds: z.array(z.string()).optional(),
  requireApproval: z.boolean().optional(),
})

export const adminCreateMarketplaceSchema = baseCreateMarketplaceSchema
export const adminUpdateMarketplaceSchema = baseUpdateMarketplaceSchema

export const verifyPluginSchema = z.object({
  verified: z.boolean(),
})

export const featurePluginSchema = z.object({
  featured: z.boolean(),
})

export {
  marketplaceSlugSchema,
  pluginSlugSchema,
  semverSchema,
  pluginInstallationScopeSchema,
  pluginInstallationStatusSchema,
}

export type ListMarketplacesQuery = z.infer<typeof listMarketplacesQuerySchema>
export type CreateMarketplaceInput = z.infer<typeof createMarketplaceSchema>
export type UpdateMarketplaceInput = z.infer<typeof updateMarketplaceSchema>
export type ListPluginsQuery = z.infer<typeof listPluginsQuerySchema>
export type InstallPluginInput = z.infer<typeof installPluginSchema>
export type UpdateInstallationInput = z.infer<typeof updateInstallationSchema>
export type UpdateVersionInput = z.infer<typeof updateVersionSchema>
export type ListInstallationsQuery = z.infer<typeof listInstallationsQuerySchema>
export type UpdateOrgMarketplaceSettingsInput = z.infer<
  typeof updateOrgMarketplaceSettingsSchema
>
export type AdminCreateMarketplaceInput = z.infer<
  typeof adminCreateMarketplaceSchema
>
export type AdminUpdateMarketplaceInput = z.infer<
  typeof adminUpdateMarketplaceSchema
>
export type VerifyPluginInput = z.infer<typeof verifyPluginSchema>
export type FeaturePluginInput = z.infer<typeof featurePluginSchema>
