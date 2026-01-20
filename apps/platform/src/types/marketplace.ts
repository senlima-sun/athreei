/**
 * Marketplace feature type definitions
 *
 * These types are designed for the frontend platform, separating API response
 * types from display/form types where appropriate.
 */

/**
 * Marketplace owner type - who owns/manages the marketplace
 */
export type MarketplaceOwnerType = "system" | "organization" | "user"

/**
 * Source type for marketplace plugin syncing
 */
export type MarketplaceSourceType = "internal" | "github" | "gitlab" | "url"

/**
 * Plugin component types - the types of components a plugin can provide
 */
export type PluginComponentType =
  | "mcp_server"
  | "skill"
  | "hook"
  | "command"
  | "agent"

/**
 * Installation scope - determines visibility of the installation
 */
export type PluginInstallationScope = "organization" | "user"

/**
 * Installation status - current state of a plugin installation
 */
export type PluginInstallationStatus = "active" | "disabled" | "pending_update"

/**
 * Sort options for plugin search
 */
export type PluginSortOption = "popularity" | "recent" | "name"

/**
 * Plugin author information
 */
export interface PluginAuthor {
  name: string
  email?: string
}

/**
 * Environment variable definition for MCP server components
 */
export interface EnvVarDefinition {
  name: string
  description: string
  required: boolean
}

/**
 * Marketplace as returned from the API
 */
export interface Marketplace {
  id: string
  slug: string
  name: string
  description: string | null
  ownerType: MarketplaceOwnerType
  ownerId: string | null
  sourceType: MarketplaceSourceType
  sourceUrl: string | null
  sourceRepo: string | null
  sourceRef: string | null
  isPublic: boolean
  isDefault: boolean
  autoUpdate: boolean
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Marketplace reference - minimal info used in nested objects
 */
export interface MarketplaceRef {
  id: string
  slug: string
  name: string
}

/**
 * Query parameters for listing marketplaces
 */
export interface ListMarketplacesParams {
  search?: string
  ownerType?: MarketplaceOwnerType
  isPublic?: boolean
  limit?: number
  offset?: number
}

/**
 * Plugin as returned from the API (full details)
 */
export interface Plugin {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: string | null
  homepage: string | null
  repository: string | null
  license: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  createdAt: string
  updatedAt: string
  marketplace: MarketplaceRef
}

/**
 * Plugin search result - optimized for list views
 */
export interface PluginSearchResult {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  marketplace: MarketplaceRef
  latestVersion: {
    id: string
    version: string
    publishedAt: string
  } | null
}

/**
 * Plugin version summary - used in version lists
 */
export interface PluginVersionSummary {
  id: string
  version: string
  changelog: string | null
  isLatest: boolean
  publishedAt: string
}

/**
 * Plugin manifest - describes the plugin structure and contents
 */
export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: PluginAuthor
  commands?: string | string[]
  agents?: string | string[]
  skills?: string | string[]
  hooks?: string | Record<string, unknown>
  mcpServers?: string | Record<string, unknown>
  lspServers?: string | Record<string, unknown>
}

/**
 * Plugin version with full details including manifest and components
 */
export interface PluginVersion {
  id: string
  version: string
  changelog: string | null
  manifest: PluginManifest
  isLatest: boolean
  publishedAt: string
  components: PluginComponentSummary[]
}

/**
 * Plugin component summary - basic info about a component
 */
export interface PluginComponentSummary {
  id: string
  type: PluginComponentType | string
  name: string
  description: string | null
}

/**
 * Plugin component with full configuration
 */
export interface PluginComponent {
  id: string
  type: PluginComponentType | string
  name: string
  description: string | null
  config: Record<string, unknown>
}

/**
 * MCP server component configuration
 */
export interface McpServerComponentConfig {
  transport: "stdio" | "sse" | "streamable-http" | "websocket"
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  envVars?: EnvVarDefinition[]
}

/**
 * Plugin install check result - indicates if a plugin is installed for a user/org
 */
export interface PluginInstallCheckResult {
  installed: boolean
  installedVersion?: string
  installationId?: string
}

/**
 * Plugin details - full plugin information including versions and components
 */
export interface PluginDetails extends Plugin {
  versions: PluginVersionSummary[]
  components: PluginComponentSummary[]
  installationStatus?: PluginInstallCheckResult
}

/**
 * Query parameters for searching/filtering plugins
 */
export interface ListPluginsParams {
  search?: string
  marketplaceSlug?: string
  category?: string
  tags?: string
  componentType?: PluginComponentType
  transport?: "stdio" | "sse"
  isVerified?: boolean
  isFeatured?: boolean
  sort?: PluginSortOption
  limit?: number
  offset?: number
}

/**
 * Plugin installation as returned from the API
 */
export interface PluginInstallation {
  id: string
  organizationId: string
  pluginId: string
  pluginVersionId: string
  installedBy: string | null
  scope: PluginInstallationScope
  status: PluginInstallationStatus
  config: Record<string, unknown> | null
  installedAt: string
  updatedAt: string
  plugin: {
    id: string
    slug: string
    name: string
    marketplace: MarketplaceRef
  }
  version: {
    id: string
    version: string
  }
}

/**
 * Input for installing a plugin
 */
export interface InstallPluginInput {
  marketplaceSlug: string
  pluginSlug: string
  version?: string
  scope?: PluginInstallationScope
  config?: Record<string, unknown>
  envValues?: Record<string, string>
}

/**
 * Input for updating an installation
 */
export interface UpdateInstallationInput {
  status?: PluginInstallationStatus
  config?: Record<string, unknown>
  envValues?: Record<string, string>
}

/**
 * Input for updating installation version
 */
export interface UpdateVersionInput {
  version?: string
}

/**
 * Query parameters for listing installations
 */
export interface ListInstallationsParams {
  status?: PluginInstallationStatus
  scope?: PluginInstallationScope
  componentType?: string
  limit?: number
  offset?: number
}

/**
 * Organization marketplace settings - controls which marketplaces/plugins are available
 */
export interface OrgMarketplaceSettings {
  id: string
  organizationId: string
  restrictMarketplaces: boolean
  allowedMarketplaceIds: string[]
  restrictPlugins: boolean
  allowedPluginIds: string[]
  defaultPluginIds: string[]
  requireApproval: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Input for updating organization marketplace settings
 */
export interface UpdateOrgMarketplaceSettingsInput {
  restrictMarketplaces?: boolean
  allowedMarketplaceIds?: string[]
  restrictPlugins?: boolean
  allowedPluginIds?: string[]
  defaultPluginIds?: string[]
  requireApproval?: boolean
}

/**
 * Pagination info returned with list responses
 */
export interface PaginationInfo {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

/**
 * Paginated response wrapper for plugin search
 */
export interface PluginSearchResponse {
  data: PluginSearchResult[]
  pagination: PaginationInfo
}

/**
 * Paginated response wrapper for installations
 */
export interface InstallationsResponse {
  data: PluginInstallation[]
  pagination: PaginationInfo
}

/**
 * Paginated response wrapper for marketplaces
 */
export interface MarketplacesResponse {
  data: Marketplace[]
  pagination: PaginationInfo
}

/**
 * Plugin category with count - for category filters
 */
export interface PluginCategory {
  name: string
  slug: string
  count: number
}

/**
 * Form data for plugin installation dialog
 */
export interface InstallPluginFormData {
  version: string
  scope: PluginInstallationScope
  envValues: Record<string, string>
}

/**
 * Display-friendly plugin card data
 */
export interface PluginCardData {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  marketplaceSlug: string
  marketplaceName: string
  latestVersion: string | null
  isInstalled: boolean
}

/**
 * Filter state for plugin browse page
 */
export interface PluginFilterState {
  search: string
  category: string | null
  tags: string[]
  verified: boolean | null
  featured: boolean | null
  sort: PluginSortOption
}

/**
 * Installation action result
 */
export type InstallationActionResult =
  | { success: true; installation: PluginInstallation }
  | { success: false; error: string }

/**
 * Uninstallation action result
 */
export type UninstallActionResult =
  | { success: true; message: string }
  | { success: false; error: string }
