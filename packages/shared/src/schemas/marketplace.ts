import { z } from "zod"

export const marketplaceOwnerTypeSchema = z.enum([
  "system",
  "organization",
  "user",
])

export const marketplaceSourceTypeSchema = z.enum([
  "internal",
  "github",
  "gitlab",
  "url",
])

export const pluginComponentTypeSchema = z.enum([
  "mcp_server",
  "skill",
  "hook",
  "command",
  "agent",
])

export const pluginInstallationScopeSchema = z.enum(["organization", "user"])

export const pluginInstallationStatusSchema = z.enum([
  "active",
  "disabled",
  "pending_update",
])

export const marketplaceSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")

export const pluginSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")

export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, "Must be valid semver format")

export const authorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
})

export const envVarDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  required: z.boolean(),
})

export const mcpServerComponentConfigSchema = z.object({
  transport: z.enum(["stdio", "sse", "streamable-http", "websocket"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  envVars: z.array(envVarDefinitionSchema).optional(),
})

export const createMarketplaceSchema = z.object({
  slug: marketplaceSlugSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerType: marketplaceOwnerTypeSchema.default("system"),
  ownerId: z.string().uuid().optional(),
  sourceType: marketplaceSourceTypeSchema.default("internal"),
  sourceUrl: z.string().url().optional(),
  sourceRepo: z.string().max(255).optional(),
  sourceRef: z.string().max(100).optional(),
  isPublic: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  autoUpdate: z.boolean().default(true),
})

export const updateMarketplaceSchema = createMarketplaceSchema
  .partial()
  .omit({ slug: true })

export const createPluginSchema = z.object({
  marketplaceId: z.string().uuid(),
  slug: pluginSlugSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).default([]),
  author: authorSchema.optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().max(50).optional(),
  iconUrl: z.string().url().optional(),
})

export const updatePluginSchema = createPluginSchema.partial().omit({
  marketplaceId: true,
  slug: true,
})

export const pluginManifestSchema = z.object({
  name: z.string().min(1),
  version: semverSchema,
  description: z.string().optional(),
  author: authorSchema.optional(),
  commands: z.union([z.string(), z.array(z.string())]).optional(),
  agents: z.union([z.string(), z.array(z.string())]).optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  hooks: z.union([z.string(), z.record(z.any())]).optional(),
  mcpServers: z.union([z.string(), z.record(z.any())]).optional(),
  lspServers: z.union([z.string(), z.record(z.any())]).optional(),
})

export const createPluginVersionSchema = z.object({
  pluginId: z.string().uuid(),
  version: semverSchema,
  changelog: z.string().optional(),
  manifest: pluginManifestSchema,
  sourceHash: z.string().max(64).optional(),
  isLatest: z.boolean().default(false),
})

export const createPluginComponentSchema = z.object({
  pluginVersionId: z.string().uuid(),
  type: pluginComponentTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  config: z.record(z.any()),
})

export const createPluginInstallationSchema = z.object({
  organizationId: z.string().uuid(),
  pluginId: z.string().uuid(),
  pluginVersionId: z.string().uuid(),
  installedBy: z.string().uuid().optional(),
  scope: pluginInstallationScopeSchema.default("organization"),
  config: z.record(z.any()).optional(),
})

export const updatePluginInstallationSchema = z.object({
  pluginVersionId: z.string().uuid().optional(),
  status: pluginInstallationStatusSchema.optional(),
  config: z.record(z.any()).optional(),
})

export const organizationMarketplaceSettingSchema = z.object({
  organizationId: z.string().uuid(),
  restrictMarketplaces: z.boolean().default(false),
  allowedMarketplaceIds: z.array(z.string().uuid()).default([]),
  restrictPlugins: z.boolean().default(false),
  allowedPluginIds: z.array(z.string().uuid()).default([]),
  defaultPluginIds: z.array(z.string().uuid()).default([]),
  requireApproval: z.boolean().default(false),
})

export const listPluginsQuerySchema = z.object({
  marketplaceId: z.string().uuid().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export type MarketplaceOwnerType = z.infer<typeof marketplaceOwnerTypeSchema>
export type MarketplaceSourceType = z.infer<typeof marketplaceSourceTypeSchema>
export type PluginComponentType = z.infer<typeof pluginComponentTypeSchema>
export type PluginInstallationScope = z.infer<
  typeof pluginInstallationScopeSchema
>
export type PluginInstallationStatus = z.infer<
  typeof pluginInstallationStatusSchema
>
export type Author = z.infer<typeof authorSchema>
export type EnvVarDefinition = z.infer<typeof envVarDefinitionSchema>
export type McpServerComponentConfig = z.infer<
  typeof mcpServerComponentConfigSchema
>
export type CreateMarketplaceInput = z.infer<typeof createMarketplaceSchema>
export type UpdateMarketplaceInput = z.infer<typeof updateMarketplaceSchema>
export type CreatePluginInput = z.infer<typeof createPluginSchema>
export type UpdatePluginInput = z.infer<typeof updatePluginSchema>
export type PluginManifest = z.infer<typeof pluginManifestSchema>
export type CreatePluginVersionInput = z.infer<typeof createPluginVersionSchema>
export type CreatePluginComponentInput = z.infer<
  typeof createPluginComponentSchema
>
export type CreatePluginInstallationInput = z.infer<
  typeof createPluginInstallationSchema
>
export type UpdatePluginInstallationInput = z.infer<
  typeof updatePluginInstallationSchema
>
export type OrganizationMarketplaceSettingInput = z.infer<
  typeof organizationMarketplaceSettingSchema
>
export type ListPluginsQuery = z.infer<typeof listPluginsQuerySchema>
