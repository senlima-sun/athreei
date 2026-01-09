import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { REGISTRY_SERVERS } from "../data/mcp-registry"

const registry = new Hono()

const registryQuerySchema = z.object({
  category: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  verified: z.enum(["true", "false"]).optional(),
})

registry.get("/", zValidator("query", registryQuerySchema), (c) => {
  const { category, search, verified: verifiedParam } = c.req.valid("query")
  const searchLower = search?.toLowerCase()

  let servers = [...REGISTRY_SERVERS]

  if (category) {
    servers = servers.filter((s) => s.categories.includes(category))
  }

  if (searchLower) {
    servers = servers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.publisher.toLowerCase().includes(searchLower)
    )
  }

  if (verifiedParam !== undefined) {
    const verified = verifiedParam === "true"
    servers = servers.filter((s) => s.verified === verified)
  }

  const categories = [
    ...new Set(REGISTRY_SERVERS.flatMap((s) => s.categories)),
  ].sort()

  return c.json({
    servers,
    total: servers.length,
    categories,
  })
})

registry.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const server = REGISTRY_SERVERS.find((s) => s.slug === slug)

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  return c.json(server)
})

export default registry
