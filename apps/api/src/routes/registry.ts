import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { registryQuerySchema } from "../schemas"
import {
  getRegistryServers,
  getRegistryServerBySlug,
  getRegistryCategories,
} from "../services"

const registry = new Hono()

registry.get("/", zValidator("query", registryQuerySchema), async (c) => {
  const { category, search, verified: verifiedParam } = c.req.valid("query")
  const searchLower = search?.toLowerCase()

  let servers = await getRegistryServers()

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

  const categories = await getRegistryCategories()

  c.header("Cache-Control", "public, max-age=300")

  return c.json({
    servers,
    total: servers.length,
    categories,
  })
})

registry.get("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const server = await getRegistryServerBySlug(slug)

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  c.header("Cache-Control", "public, max-age=300")

  return c.json(server)
})

export default registry
