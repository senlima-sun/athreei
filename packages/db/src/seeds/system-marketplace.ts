/**
 * System Marketplace Seed
 *
 * Creates the "public-mcp-servers" system marketplace that serves as the
 * consolidated destination for the legacy MCP registry data.
 */

import type { InferInsertModel } from "drizzle-orm"
import type { marketplace as pgMarketplace } from "../schema/pg/marketplaces"

export type MarketplaceInsert = InferInsertModel<typeof pgMarketplace>

export const SYSTEM_MARKETPLACE_ID = "00000000-0000-0000-0000-000000000001"
export const SYSTEM_MARKETPLACE_SLUG = "public-mcp-servers"

export const systemMarketplace: Omit<
  MarketplaceInsert,
  "createdAt" | "updatedAt"
> = {
  id: SYSTEM_MARKETPLACE_ID,
  slug: SYSTEM_MARKETPLACE_SLUG,
  name: "Public MCP Servers",
  description:
    "Official collection of public MCP servers from verified publishers. Browse and install servers to extend your AI applications with external integrations.",
  ownerType: "system",
  ownerId: null,
  sourceType: "internal",
  sourceUrl: null,
  sourceRepo: null,
  sourceRef: null,
  isPublic: true,
  isDefault: true,
  autoUpdate: false,
  lastSyncedAt: null,
}

export function getSystemMarketplaceSeedData(): MarketplaceInsert {
  const now = new Date()
  return {
    ...systemMarketplace,
    createdAt: now,
    updatedAt: now,
  }
}
