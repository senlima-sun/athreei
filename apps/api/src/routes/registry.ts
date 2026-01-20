/**
 * Registry Routes (Deprecated)
 *
 * These routes proxy to the marketplace API for backwards compatibility.
 * New clients should use /api/plugins with componentType=mcp_server filter.
 *
 * Deprecation timeline:
 * - Phase 1: Proxy with deprecation headers (current)
 * - Phase 2: Return 301 redirects
 * - Phase 3: Remove routes entirely
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { registryQuerySchema } from "../schemas"
import { searchPlugins, getPluginDetails } from "../services"
import {
  pluginToRegistryServer,
  pluginDetailsToRegistryServer,
  extractCategoriesFromPlugins,
  type RegistryServer,
} from "../services/registry-compat"
import { SYSTEM_MARKETPLACE_SLUG } from "@athreei/db/seeds"

const DEPRECATION_DATE = "2026-03-01"
const SUNSET_DATE = "2026-06-01"

const registry = new Hono()

function addDeprecationHeaders(c: {
  header: (name: string, value: string) => void
}) {
  c.header("Deprecation", `date="${DEPRECATION_DATE}"`)
  c.header("Sunset", SUNSET_DATE)
  c.header(
    "Link",
    '</api/plugins?componentType=mcp_server&marketplaceSlug=public-mcp-servers>; rel="successor-version"'
  )
  c.header(
    "X-Deprecation-Notice",
    "Use /api/plugins with componentType=mcp_server"
  )
}

registry.get("/", zValidator("query", registryQuerySchema), async (c) => {
  const { category, search, verified: verifiedParam } = c.req.valid("query")

  addDeprecationHeaders(c)

  const result = await searchPlugins(
    {
      search: search || undefined,
      category: category || undefined,
      marketplaceSlug: SYSTEM_MARKETPLACE_SLUG,
      componentType: "mcp_server",
      isVerified: verifiedParam === "true" ? true : undefined,
      sort: "popularity",
      limit: 100,
      offset: 0,
    },
    undefined
  )

  const servers: RegistryServer[] = result.data.map((plugin) =>
    pluginToRegistryServer(plugin)
  )

  const categories = extractCategoriesFromPlugins(result.data)

  c.header("Cache-Control", "public, max-age=300")

  return c.json({
    servers,
    total: servers.length,
    categories,
  })
})

registry.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  addDeprecationHeaders(c)

  const plugin = await getPluginDetails(
    SYSTEM_MARKETPLACE_SLUG,
    slug,
    undefined
  )

  if (!plugin) {
    return c.json({ error: "Server not found" }, 404)
  }

  const server = pluginDetailsToRegistryServer(plugin)

  c.header("Cache-Control", "public, max-age=300")

  return c.json(server)
})

export default registry
