import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import {
  submitPlugin,
  getSubmission,
  listSubmissions,
  cancelSubmission,
  reviewSubmission,
} from "../services/plugin-submission"
import { verifyOrganizationMembership, isOrgAdmin } from "../services"

const submitPluginSchema = z.object({
  marketplaceSlug: z.string().min(1),
  pluginSlug: z.string().min(1).max(100),
  pluginName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  sourceRepo: z.string().min(1).max(500),
  sourceRef: z.string().max(100).default("main"),
  sourcePath: z.string().max(500).optional(),
})

const listSubmissionsSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const reviewSubmissionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
})

const pluginSubmissions = new Hono()

pluginSubmissions.use("*", authMiddleware)

pluginSubmissions.post("/", zValidator("json", submitPluginSchema), async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId") as string
  const body = c.req.valid("json")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  try {
    const submission = await submitPlugin(orgId, auth.userId, body)
    return c.json({ submission }, 201)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        throw ApiError.notFound(error.message)
      }
      if (error.message.includes("already exists") || error.message.includes("pending")) {
        throw ApiError.conflict(error.message)
      }
      if (error.message.includes("validation failed")) {
        throw ApiError.badRequest(error.message)
      }
    }
    throw error
  }
})

pluginSubmissions.get("/", zValidator("query", listSubmissionsSchema), async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId") as string
  const query = c.req.valid("query")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const result = await listSubmissions(orgId, auth.userId, query)
  return c.json(result)
})

pluginSubmissions.get("/:submissionId", async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId") as string
  const submissionId = c.req.param("submissionId")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const submission = await getSubmission(submissionId, auth.userId, orgId)
  if (!submission) {
    throw ApiError.notFound("Submission not found")
  }

  return c.json({ submission })
})

pluginSubmissions.post("/:submissionId/cancel", async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId") as string
  const submissionId = c.req.param("submissionId")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  try {
    await cancelSubmission(submissionId, auth.userId)
    return c.json({ message: "Submission cancelled" })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        throw ApiError.notFound(error.message)
      }
      if (error.message.includes("Only the submitter")) {
        throw ApiError.forbidden(error.message)
      }
      if (error.message.includes("Cannot cancel")) {
        throw ApiError.badRequest(error.message)
      }
    }
    throw error
  }
})

pluginSubmissions.post(
  "/:submissionId/review",
  zValidator("json", reviewSubmissionSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId") as string
    const submissionId = c.req.param("submissionId")
    const body = c.req.valid("json")

    const isMember = await verifyOrganizationMembership(auth.userId, orgId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    const adminCheck = await isOrgAdmin(auth.userId, orgId)
    if (!adminCheck) {
      throw ApiError.forbidden("Only organization admins can review submissions")
    }

    try {
      const result = await reviewSubmission(submissionId, auth.userId, body)
      return c.json(result)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw ApiError.notFound(error.message)
        }
        if (error.message.includes("not pending")) {
          throw ApiError.badRequest(error.message)
        }
      }
      throw error
    }
  }
)

export default pluginSubmissions
