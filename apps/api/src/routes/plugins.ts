import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { ApiError } from "../middleware"
import { listPluginsQuerySchema } from "../schemas/marketplaces"
import {
  searchPlugins,
  getPluginDetails,
  getPluginVersions,
  getPluginVersionDetails,
} from "../services"

const plugins = new Hono()

plugins.get("/", zValidator("query", listPluginsQuerySchema), async (c) => {
  const query = c.req.valid("query")
  const organizationId = c.req.query("organizationId")

  const result = await searchPlugins(query, organizationId)
  return c.json(result)
})

plugins.get("/:marketplaceSlug/:pluginSlug", async (c) => {
  const { marketplaceSlug, pluginSlug } = c.req.param()
  const organizationId = c.req.query("organizationId")

  const plugin = await getPluginDetails(
    marketplaceSlug,
    pluginSlug,
    organizationId
  )

  if (!plugin) {
    throw ApiError.notFound("Plugin not found")
  }

  return c.json({ plugin })
})

plugins.get("/:marketplaceSlug/:pluginSlug/versions", async (c) => {
  const { marketplaceSlug, pluginSlug } = c.req.param()
  const organizationId = c.req.query("organizationId")

  const versions = await getPluginVersions(
    marketplaceSlug,
    pluginSlug,
    organizationId
  )

  if (versions.length === 0) {
    throw ApiError.notFound("Plugin not found")
  }

  return c.json({ versions })
})

plugins.get("/:marketplaceSlug/:pluginSlug/versions/:version", async (c) => {
  const { marketplaceSlug, pluginSlug, version } = c.req.param()
  const organizationId = c.req.query("organizationId")

  const versionDetails = await getPluginVersionDetails(
    marketplaceSlug,
    pluginSlug,
    version,
    organizationId
  )

  if (!versionDetails) {
    throw ApiError.notFound("Version not found")
  }

  return c.json({ version: versionDetails })
})

export default plugins
