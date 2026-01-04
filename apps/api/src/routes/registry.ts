/**
 * MCP Registry routes
 *
 * Public endpoints for browsing and searching the MCP server registry.
 * No authentication required.
 */

import { Hono } from "hono"
import { REGISTRY_SERVERS } from "../data/mcp-registry"

const registry = new Hono()

/**
 * GET /api/registry
 * List all registry servers with optional filtering
 *
 * Query params:
 * - category: Filter by category (e.g., "developer-tools")
 * - search: Search by name or description
 * - verified: Filter by verified status ("true" or "false")
 */
registry.get("/", (c) => {
  const category = c.req.query("category")
  const search = c.req.query("search")?.toLowerCase()
  const verifiedParam = c.req.query("verified")

  let servers = [...REGISTRY_SERVERS]

  // Filter by category
  if (category) {
    servers = servers.filter((s) => s.categories.includes(category))
  }

  // Filter by search term (name or description)
  if (search) {
    servers = servers.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search) ||
        s.publisher.toLowerCase().includes(search)
    )
  }

  // Filter by verified status
  if (verifiedParam !== undefined) {
    const verified = verifiedParam === "true"
    servers = servers.filter((s) => s.verified === verified)
  }

  // Get unique categories for filtering UI
  const categories = [
    ...new Set(REGISTRY_SERVERS.flatMap((s) => s.categories)),
  ].sort()

  return c.json({
    servers,
    total: servers.length,
    categories,
  })
})

/**
 * GET /api/registry/:slug
 * Get a single server by slug
 */
registry.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const server = REGISTRY_SERVERS.find((s) => s.slug === slug)

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  return c.json(server)
})

export default registry
