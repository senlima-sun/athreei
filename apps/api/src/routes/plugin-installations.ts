import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import {
  installPluginSchema,
  updateInstallationSchema,
  updateVersionSchema,
  listInstallationsQuerySchema,
} from "../schemas/marketplaces"
import {
  verifyOrganizationMembership,
  installPlugin,
  uninstallPlugin,
  updateInstallation,
  updateInstallationVersion,
  listInstallations,
  getDecryptedEnv,
  checkEnvRateLimit,
  setEnvRateLimitHeaders,
} from "../services"

const pluginInstallations = new Hono()

pluginInstallations.use("*", authMiddleware)

pluginInstallations.get(
  "/:orgId/plugins",
  zValidator("query", listInstallationsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const query = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    const result = await listInstallations(orgId, query)
    return c.json(result)
  }
)

pluginInstallations.post(
  "/:orgId/plugins/install",
  zValidator("json", installPluginSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const body = c.req.valid("json")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    try {
      const installation = await installPlugin(orgId, auth.userId, body)
      return c.json({ installation }, 201)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw ApiError.notFound(error.message)
        }
        if (error.message.includes("already installed")) {
          throw ApiError.conflict(error.message)
        }
        if (
          error.message.includes("not allowed") ||
          error.message.includes("requires admin")
        ) {
          throw ApiError.forbidden(error.message)
        }
      }
      throw error
    }
  }
)

pluginInstallations.post(
  "/:orgId/plugins/:installationId/uninstall",
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const installationId = c.req.param("installationId")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    try {
      await uninstallPlugin(orgId, installationId, auth.userId)
      return c.json({ message: "Plugin uninstalled successfully" })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw ApiError.notFound(error.message)
        }
        if (
          error.message.includes("Only admins") ||
          error.message.includes("only uninstall your own")
        ) {
          throw ApiError.forbidden(error.message)
        }
      }
      throw error
    }
  }
)

pluginInstallations.patch(
  "/:orgId/plugins/:installationId",
  zValidator("json", updateInstallationSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const installationId = c.req.param("installationId")
    const updates = c.req.valid("json")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    try {
      const installation = await updateInstallation(
        orgId,
        installationId,
        auth.userId,
        updates
      )
      return c.json({ installation })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw ApiError.notFound(error.message)
        }
        if (
          error.message.includes("Only admins") ||
          error.message.includes("only update your own")
        ) {
          throw ApiError.forbidden(error.message)
        }
      }
      throw error
    }
  }
)

pluginInstallations.post(
  "/:orgId/plugins/:installationId/update",
  zValidator("json", updateVersionSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const installationId = c.req.param("installationId")
    const { version } = c.req.valid("json")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    try {
      const installation = await updateInstallationVersion(
        orgId,
        installationId,
        auth.userId,
        version
      )
      return c.json({ installation })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw ApiError.notFound(error.message)
        }
        if (error.message.includes("Already on")) {
          throw ApiError.badRequest(error.message)
        }
      }
      throw error
    }
  }
)

pluginInstallations.get("/:orgId/plugins/:installationId/env", async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId")
  const installationId = c.req.param("installationId")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const rateLimitResult = checkEnvRateLimit(`${orgId}:${installationId}`)
  setEnvRateLimitHeaders(c, rateLimitResult)

  if (!rateLimitResult.allowed) {
    throw ApiError.badRequest(
      "Rate limit exceeded. Try again later.",
      "RATE_LIMIT_EXCEEDED"
    )
  }

  try {
    const envValues = await getDecryptedEnv(orgId, installationId)
    return c.json({ envValues })
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw ApiError.notFound(error.message)
    }
    throw error
  }
})

export default pluginInstallations
