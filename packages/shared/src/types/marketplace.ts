/**
 * Marketplace type definitions
 */

import type {
  MarketplaceOwnerType,
  MarketplaceSourceType,
  PluginComponentType,
  PluginInstallationScope,
  PluginInstallationStatus,
  Author,
  PluginManifest,
} from "../schemas/marketplace"

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
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Plugin {
  id: string
  marketplaceId: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: Author | null
  homepage: string | null
  repository: string | null
  license: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PluginVersion {
  id: string
  pluginId: string
  version: string
  changelog: string | null
  manifest: PluginManifest
  sourceHash: string | null
  isLatest: boolean
  publishedAt: Date
  createdAt: Date
}

export interface PluginComponent {
  id: string
  pluginVersionId: string
  type: PluginComponentType
  name: string
  description: string | null
  config: Record<string, unknown>
  createdAt: Date
}

export interface PluginInstallation {
  id: string
  organizationId: string
  pluginId: string
  pluginVersionId: string
  installedBy: string | null
  scope: PluginInstallationScope
  status: PluginInstallationStatus
  config: Record<string, unknown> | null
  encryptedEnv: string | null
  envKeyVersion: number | null
  installedAt: Date
  updatedAt: Date
}

export interface OrganizationMarketplaceSetting {
  id: string
  organizationId: string
  restrictMarketplaces: boolean
  allowedMarketplaceIds: string[]
  restrictPlugins: boolean
  allowedPluginIds: string[]
  defaultPluginIds: string[]
  requireApproval: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PluginWithLatestVersion extends Plugin {
  latestVersion: PluginVersion | null
  marketplace: Pick<Marketplace, "id" | "slug" | "name">
}

export interface PluginInstallationWithDetails extends PluginInstallation {
  plugin: Plugin
  pluginVersion: PluginVersion
}
