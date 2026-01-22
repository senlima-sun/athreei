import { eq, and, desc, sql } from "drizzle-orm"
import { db } from "../lib/db-operations"
import {
  marketplace,
  plugin,
  pluginVersion,
  pluginComponent,
  pluginSubmission,
} from "@athreei/db"
import {
  generatePluginId,
  generatePluginVersionId,
  generatePluginComponentId,
} from "./id-generator"
import {
  pluginManifestSchema,
  validateClaudeCodePlugin,
  createLogger,
} from "@athreei/shared"

const logger = createLogger({
  service: "plugin-submission",
  pretty: process.env.NODE_ENV !== "production",
})

const FETCH_TIMEOUT_MS = 30000

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

function generateSubmissionId(): string {
  return `psub_${crypto.randomUUID().replace(/-/g, "")}`
}

export interface SubmitPluginInput {
  marketplaceSlug: string
  pluginSlug: string
  pluginName: string
  description?: string
  category?: string
  sourceRepo: string
  sourceRef?: string
  sourcePath?: string
}

export interface SubmissionResult {
  id: string
  marketplaceId: string
  pluginSlug: string
  pluginName: string
  version: string
  status: string
  validationStatus: string | null
  validationErrors: Array<{ path: string; message: string; code: string }> | null
  validationWarnings: Array<{ path: string; message: string; code: string }> | null
  createdAt: Date
}

export async function submitPlugin(
  organizationId: string,
  userId: string,
  input: SubmitPluginInput
): Promise<SubmissionResult> {
  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, input.marketplaceSlug),
  })

  if (!mkt) {
    throw new Error("Marketplace not found")
  }

  const sourceRef = input.sourceRef || "main"
  const sourcePath = input.sourcePath || ".claude-plugin/plugin.json"
  const manifestUrl = `https://raw.githubusercontent.com/${input.sourceRepo}/${sourceRef}/${sourcePath}`

  let rawManifest: unknown
  let manifest: ReturnType<typeof pluginManifestSchema.parse>

  try {
    const response = await fetchWithTimeout(manifestUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin.json: ${response.status}`)
    }
    rawManifest = await response.json()
  } catch (error) {
    throw new Error(
      `Failed to fetch plugin manifest: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }

  const parseResult = pluginManifestSchema.safeParse(rawManifest)
  if (!parseResult.success) {
    throw new Error(`Invalid plugin.json: ${parseResult.error.message}`)
  }
  manifest = parseResult.data

  const validationResult = validateClaudeCodePlugin(rawManifest)

  if (!validationResult.valid) {
    throw new Error(
      `Plugin validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`
    )
  }

  const existingPending = await db().query.pluginSubmission.findFirst({
    where: and(
      eq(pluginSubmission.marketplaceId, mkt.id),
      eq(pluginSubmission.pluginSlug, input.pluginSlug),
      eq(pluginSubmission.status, "pending")
    ),
  })

  if (existingPending) {
    throw new Error(
      "A pending submission already exists for this plugin. Please cancel it first or wait for review."
    )
  }

  const existingPlugin = await db().query.plugin.findFirst({
    where: and(
      eq(plugin.marketplaceId, mkt.id),
      eq(plugin.slug, input.pluginSlug)
    ),
  })

  if (existingPlugin) {
    const existingVersion = await db().query.pluginVersion.findFirst({
      where: and(
        eq(pluginVersion.pluginId, existingPlugin.id),
        eq(pluginVersion.version, manifest.version)
      ),
    })

    if (existingVersion) {
      throw new Error(
        `Version ${manifest.version} already exists for this plugin`
      )
    }
  }

  const now = new Date()
  const submissionId = generateSubmissionId()

  await db().insert(pluginSubmission).values({
    id: submissionId,
    marketplaceId: mkt.id,
    submitterId: userId,
    pluginSlug: input.pluginSlug,
    pluginName: input.pluginName,
    description: input.description || manifest.description || null,
    category: input.category || null,
    sourceType: "github",
    sourceRepo: input.sourceRepo,
    sourceRef,
    sourcePath: input.sourcePath || null,
    version: manifest.version,
    manifestJson: JSON.stringify(manifest),
    status: "pending",
    validationStatus: validationResult.warnings.length > 0 ? "warning" : "valid",
    validationErrors: null,
    validationWarnings:
      validationResult.warnings.length > 0
        ? JSON.stringify(validationResult.warnings)
        : null,
    createdAt: now,
    updatedAt: now,
  })

  logger.info("Plugin submitted", {
    submissionId,
    marketplaceId: mkt.id,
    pluginSlug: input.pluginSlug,
    version: manifest.version,
    userId,
  })

  return {
    id: submissionId,
    marketplaceId: mkt.id,
    pluginSlug: input.pluginSlug,
    pluginName: input.pluginName,
    version: manifest.version,
    status: "pending",
    validationStatus: validationResult.warnings.length > 0 ? "warning" : "valid",
    validationErrors: null,
    validationWarnings: validationResult.warnings.length > 0 ? validationResult.warnings : null,
    createdAt: now,
  }
}

export interface SubmissionDetails {
  id: string
  marketplaceId: string
  marketplaceSlug: string
  marketplaceName: string
  pluginSlug: string
  pluginName: string
  description: string | null
  category: string | null
  sourceRepo: string
  sourceRef: string
  sourcePath: string | null
  version: string
  status: string
  validationStatus: string | null
  validationErrors: Array<{ path: string; message: string; code: string }> | null
  validationWarnings: Array<{ path: string; message: string; code: string }> | null
  submitterId: string
  submitterEmail?: string
  reviewerId: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getSubmission(
  submissionId: string,
  userId: string,
  organizationId: string
): Promise<SubmissionDetails | null> {
  const result = await db()
    .select({
      id: pluginSubmission.id,
      marketplaceId: pluginSubmission.marketplaceId,
      marketplaceSlug: marketplace.slug,
      marketplaceName: marketplace.name,
      pluginSlug: pluginSubmission.pluginSlug,
      pluginName: pluginSubmission.pluginName,
      description: pluginSubmission.description,
      category: pluginSubmission.category,
      sourceRepo: pluginSubmission.sourceRepo,
      sourceRef: pluginSubmission.sourceRef,
      sourcePath: pluginSubmission.sourcePath,
      version: pluginSubmission.version,
      status: pluginSubmission.status,
      validationStatus: pluginSubmission.validationStatus,
      validationErrors: pluginSubmission.validationErrors,
      validationWarnings: pluginSubmission.validationWarnings,
      submitterId: pluginSubmission.submitterId,
      reviewerId: pluginSubmission.reviewerId,
      reviewedAt: pluginSubmission.reviewedAt,
      reviewNotes: pluginSubmission.reviewNotes,
      rejectionReason: pluginSubmission.rejectionReason,
      createdAt: pluginSubmission.createdAt,
      updatedAt: pluginSubmission.updatedAt,
    })
    .from(pluginSubmission)
    .innerJoin(marketplace, eq(pluginSubmission.marketplaceId, marketplace.id))
    .where(eq(pluginSubmission.id, submissionId))
    .limit(1)

  const submission = result[0]
  if (!submission) {
    return null
  }

  return {
    ...submission,
    validationErrors: submission.validationErrors
      ? JSON.parse(submission.validationErrors)
      : null,
    validationWarnings: submission.validationWarnings
      ? JSON.parse(submission.validationWarnings)
      : null,
  }
}

export interface ListSubmissionsQuery {
  status?: "pending" | "approved" | "rejected" | "cancelled"
  limit?: number
  offset?: number
}

export async function listSubmissions(
  organizationId: string,
  userId: string,
  query: ListSubmissionsQuery
): Promise<{
  submissions: SubmissionDetails[]
  pagination: { limit: number; offset: number; total: number; hasMore: boolean }
}> {
  const limit = query.limit || 20
  const offset = query.offset || 0

  const conditions: ReturnType<typeof eq>[] = [
    eq(pluginSubmission.submitterId, userId),
  ]

  if (query.status) {
    conditions.push(eq(pluginSubmission.status, query.status))
  }

  const whereClause = and(...conditions)

  const [submissions, countResult] = await Promise.all([
    db()
      .select({
        id: pluginSubmission.id,
        marketplaceId: pluginSubmission.marketplaceId,
        marketplaceSlug: marketplace.slug,
        marketplaceName: marketplace.name,
        pluginSlug: pluginSubmission.pluginSlug,
        pluginName: pluginSubmission.pluginName,
        description: pluginSubmission.description,
        category: pluginSubmission.category,
        sourceRepo: pluginSubmission.sourceRepo,
        sourceRef: pluginSubmission.sourceRef,
        sourcePath: pluginSubmission.sourcePath,
        version: pluginSubmission.version,
        status: pluginSubmission.status,
        validationStatus: pluginSubmission.validationStatus,
        validationErrors: pluginSubmission.validationErrors,
        validationWarnings: pluginSubmission.validationWarnings,
        submitterId: pluginSubmission.submitterId,
        reviewerId: pluginSubmission.reviewerId,
        reviewedAt: pluginSubmission.reviewedAt,
        reviewNotes: pluginSubmission.reviewNotes,
        rejectionReason: pluginSubmission.rejectionReason,
        createdAt: pluginSubmission.createdAt,
        updatedAt: pluginSubmission.updatedAt,
      })
      .from(pluginSubmission)
      .innerJoin(marketplace, eq(pluginSubmission.marketplaceId, marketplace.id))
      .where(whereClause)
      .orderBy(desc(pluginSubmission.createdAt))
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(pluginSubmission)
      .where(whereClause),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return {
    submissions: submissions.map((s) => ({
      ...s,
      validationErrors: s.validationErrors
        ? JSON.parse(s.validationErrors)
        : null,
      validationWarnings: s.validationWarnings
        ? JSON.parse(s.validationWarnings)
        : null,
    })),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + submissions.length < total,
    },
  }
}

export async function cancelSubmission(
  submissionId: string,
  userId: string
): Promise<void> {
  const submission = await db().query.pluginSubmission.findFirst({
    where: eq(pluginSubmission.id, submissionId),
  })

  if (!submission) {
    throw new Error("Submission not found")
  }

  if (submission.submitterId !== userId) {
    throw new Error("Only the submitter can cancel a submission")
  }

  if (submission.status !== "pending") {
    throw new Error("Cannot cancel a submission that is not pending")
  }

  await db()
    .update(pluginSubmission)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(pluginSubmission.id, submissionId))

  logger.info("Submission cancelled", { submissionId, userId })
}

export interface ReviewSubmissionInput {
  action: "approve" | "reject"
  notes?: string
  rejectionReason?: string
}

export interface ReviewResult {
  submission: SubmissionDetails
  plugin?: {
    id: string
    slug: string
    name: string
  }
}

export async function reviewSubmission(
  submissionId: string,
  reviewerId: string,
  input: ReviewSubmissionInput
): Promise<ReviewResult> {
  const submission = await db().query.pluginSubmission.findFirst({
    where: eq(pluginSubmission.id, submissionId),
  })

  if (!submission) {
    throw new Error("Submission not found")
  }

  if (submission.status !== "pending") {
    throw new Error("Submission is not pending review")
  }

  const now = new Date()

  if (input.action === "reject") {
    await db()
      .update(pluginSubmission)
      .set({
        status: "rejected",
        reviewerId,
        reviewedAt: now,
        reviewNotes: input.notes || null,
        rejectionReason: input.rejectionReason || null,
        updatedAt: now,
      })
      .where(eq(pluginSubmission.id, submissionId))

    logger.info("Submission rejected", { submissionId, reviewerId })

    const updated = await getSubmission(submissionId, submission.submitterId, "")
    return { submission: updated! }
  }

  const manifest = JSON.parse(submission.manifestJson)

  const existingPlugin = await db().query.plugin.findFirst({
    where: and(
      eq(plugin.marketplaceId, submission.marketplaceId),
      eq(plugin.slug, submission.pluginSlug)
    ),
  })

  let pluginId: string

  if (existingPlugin) {
    pluginId = existingPlugin.id

    await db()
      .update(plugin)
      .set({
        name: submission.pluginName,
        description: submission.description,
        category: submission.category,
        updatedAt: now,
      })
      .where(eq(plugin.id, pluginId))
  } else {
    pluginId = generatePluginId()

    await db().insert(plugin).values({
      id: pluginId,
      marketplaceId: submission.marketplaceId,
      slug: submission.pluginSlug,
      name: submission.pluginName,
      description: submission.description,
      category: submission.category,
      author: manifest.author?.name || null,
      repository: `https://github.com/${submission.sourceRepo}`,
      tags: "[]",
      downloadCount: "0",
      createdAt: now,
      updatedAt: now,
    })
  }

  await db()
    .update(pluginVersion)
    .set({ isLatest: false })
    .where(eq(pluginVersion.pluginId, pluginId))

  const versionId = generatePluginVersionId()

  await db().insert(pluginVersion).values({
    id: versionId,
    pluginId,
    version: submission.version,
    manifest: submission.manifestJson,
    isLatest: true,
    validationStatus: submission.validationStatus || "valid",
    validationErrors: submission.validationErrors,
    validationWarnings: submission.validationWarnings,
    publishedAt: now,
    createdAt: now,
  })

  const components: Array<typeof pluginComponent.$inferInsert> = []

  if (manifest.commands) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "command",
      name: "Commands",
      config: JSON.stringify({
        path: Array.isArray(manifest.commands)
          ? manifest.commands
          : manifest.commands,
      }),
      createdAt: now,
    })
  }

  if (manifest.skills) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "skill",
      name: "Skills",
      config: JSON.stringify({
        path: Array.isArray(manifest.skills)
          ? manifest.skills
          : manifest.skills,
      }),
      createdAt: now,
    })
  }

  if (manifest.agents) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "agent",
      name: "Agents",
      config: JSON.stringify({
        path: Array.isArray(manifest.agents)
          ? manifest.agents
          : manifest.agents,
      }),
      createdAt: now,
    })
  }

  if (manifest.hooks) {
    components.push({
      id: generatePluginComponentId(),
      pluginVersionId: versionId,
      type: "hook",
      name: "Hooks",
      config: JSON.stringify(
        typeof manifest.hooks === "string"
          ? { path: manifest.hooks }
          : manifest.hooks
      ),
      createdAt: now,
    })
  }

  if (manifest.mcpServers) {
    if (typeof manifest.mcpServers === "string") {
      components.push({
        id: generatePluginComponentId(),
        pluginVersionId: versionId,
        type: "mcp_server",
        name: "MCP Servers",
        config: JSON.stringify({ path: manifest.mcpServers }),
        createdAt: now,
      })
    } else {
      for (const [name, config] of Object.entries(manifest.mcpServers)) {
        components.push({
          id: generatePluginComponentId(),
          pluginVersionId: versionId,
          type: "mcp_server",
          name,
          config: JSON.stringify(config),
          createdAt: now,
        })
      }
    }
  }

  if (components.length > 0) {
    await db().insert(pluginComponent).values(components)
  }

  await db()
    .update(pluginSubmission)
    .set({
      status: "approved",
      reviewerId,
      reviewedAt: now,
      reviewNotes: input.notes || null,
      publishedPluginId: pluginId,
      updatedAt: now,
    })
    .where(eq(pluginSubmission.id, submissionId))

  logger.info("Submission approved", {
    submissionId,
    reviewerId,
    pluginId,
    versionId,
  })

  const updated = await getSubmission(submissionId, submission.submitterId, "")

  return {
    submission: updated!,
    plugin: {
      id: pluginId,
      slug: submission.pluginSlug,
      name: submission.pluginName,
    },
  }
}
