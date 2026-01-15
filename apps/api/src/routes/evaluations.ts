import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, gte, lte, desc, sql } from "drizzle-orm"
import {
  authMiddleware,
  getAuthContext,
  ApiError,
  withOrgFromQuery,
  getOrgContext,
} from "../middleware"
import { db } from "../lib/db-operations"
import { evaluation, skill, rule } from "@athreei/db"
import {
  createEvaluationSchema,
  listEvaluationsQuerySchema,
  analyticsQuerySchema,
} from "../schemas/evaluations"
import { verifyOrganizationMembership } from "../services"

const evaluations = new Hono()

evaluations.use("*", authMiddleware)

evaluations.get(
  "/",
  withOrgFromQuery,
  zValidator("query", listEvaluationsQuerySchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const { traceId, skillId, ruleId, minRating, maxRating, limit, offset } =
      c.req.valid("query")

    const conditions = [eq(evaluation.organizationId, organizationId)]

    if (traceId) {
      conditions.push(eq(evaluation.traceId, traceId))
    }
    if (minRating !== undefined) {
      conditions.push(gte(evaluation.rating, minRating))
    }
    if (maxRating !== undefined) {
      conditions.push(lte(evaluation.rating, maxRating))
    }

    let evaluationList = await db().query.evaluation.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: desc(evaluation.createdAt),
    })

    if (skillId) {
      evaluationList = evaluationList.filter((e) => {
        if (!e.activeSkillIds) return false
        try {
          const skillIds = JSON.parse(e.activeSkillIds) as string[]
          return skillIds.includes(skillId)
        } catch {
          return false
        }
      })
    }

    if (ruleId) {
      evaluationList = evaluationList.filter((e) => {
        if (!e.activeRuleIds) return false
        try {
          const ruleIds = JSON.parse(e.activeRuleIds) as string[]
          return ruleIds.includes(ruleId)
        } catch {
          return false
        }
      })
    }

    return c.json({
      data: evaluationList.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        traceId: e.traceId,
        userId: e.userId,
        rating: e.rating,
        feedback: e.feedback,
        activeSkillIds: (() => {
          if (!e.activeSkillIds) return []
          try {
            return JSON.parse(e.activeSkillIds) as string[]
          } catch {
            return []
          }
        })(),
        activeRuleIds: (() => {
          if (!e.activeRuleIds) return []
          try {
            return JSON.parse(e.activeRuleIds) as string[]
          } catch {
            return []
          }
        })(),
        createdAt: e.createdAt,
      })),
      total: evaluationList.length,
    })
  }
)

evaluations.get("/:id", async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()

  const foundEvaluation = await db().query.evaluation.findFirst({
    where: eq(evaluation.id, id),
  })

  if (!foundEvaluation) {
    throw ApiError.notFound("Evaluation not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    foundEvaluation.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  return c.json({
    data: {
      id: foundEvaluation.id,
      organizationId: foundEvaluation.organizationId,
      traceId: foundEvaluation.traceId,
      userId: foundEvaluation.userId,
      rating: foundEvaluation.rating,
      feedback: foundEvaluation.feedback,
      activeSkillIds: (() => {
        if (!foundEvaluation.activeSkillIds) return []
        try {
          return JSON.parse(foundEvaluation.activeSkillIds) as string[]
        } catch {
          return []
        }
      })(),
      activeRuleIds: (() => {
        if (!foundEvaluation.activeRuleIds) return []
        try {
          return JSON.parse(foundEvaluation.activeRuleIds) as string[]
        } catch {
          return []
        }
      })(),
      createdAt: foundEvaluation.createdAt,
    },
  })
})

evaluations.post(
  "/",
  withOrgFromQuery,
  zValidator("json", createEvaluationSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId } = getOrgContext(c)
    const input = c.req.valid("json")

    const newEvaluation = {
      id: crypto.randomUUID(),
      organizationId,
      traceId: input.traceId,
      userId: auth.userId,
      rating: input.rating,
      feedback: input.feedback ?? null,
      activeSkillIds: input.activeSkillIds
        ? JSON.stringify(input.activeSkillIds)
        : null,
      activeRuleIds: input.activeRuleIds
        ? JSON.stringify(input.activeRuleIds)
        : null,
      createdAt: new Date(),
    }

    const [created] = await db()
      .insert(evaluation)
      .values(newEvaluation)
      .returning()

    return c.json(
      {
        data: {
          id: created.id,
          organizationId: created.organizationId,
          traceId: created.traceId,
          userId: created.userId,
          rating: created.rating,
          feedback: created.feedback,
          activeSkillIds: input.activeSkillIds || [],
          activeRuleIds: input.activeRuleIds || [],
          createdAt: created.createdAt,
        },
      },
      201
    )
  }
)

evaluations.get(
  "/analytics/overview",
  withOrgFromQuery,
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const { startDate, endDate } = c.req.valid("query")

    const conditions = [eq(evaluation.organizationId, organizationId)]

    if (startDate) {
      conditions.push(gte(evaluation.createdAt, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(evaluation.createdAt, new Date(endDate)))
    }

    const evaluationList = await db().query.evaluation.findMany({
      where: and(...conditions),
    })

    const skillEffectiveness: Record<
      string,
      { totalRating: number; count: number }
    > = {}
    const ruleEffectiveness: Record<
      string,
      { totalRating: number; count: number }
    > = {}

    for (const e of evaluationList) {
      if (e.activeSkillIds) {
        try {
          const skillIds = JSON.parse(e.activeSkillIds) as string[]
          for (const skillId of skillIds) {
            if (!skillEffectiveness[skillId]) {
              skillEffectiveness[skillId] = { totalRating: 0, count: 0 }
            }
            skillEffectiveness[skillId].totalRating += e.rating
            skillEffectiveness[skillId].count += 1
          }
        } catch {
          // Skip malformed data
        }
      }

      if (e.activeRuleIds) {
        try {
          const ruleIds = JSON.parse(e.activeRuleIds) as string[]
          for (const ruleId of ruleIds) {
            if (!ruleEffectiveness[ruleId]) {
              ruleEffectiveness[ruleId] = { totalRating: 0, count: 0 }
            }
            ruleEffectiveness[ruleId].totalRating += e.rating
            ruleEffectiveness[ruleId].count += 1
          }
        } catch {
          // Skip malformed data
        }
      }
    }

    const skillIds = Object.keys(skillEffectiveness)
    const ruleIds = Object.keys(ruleEffectiveness)

    const skillsData =
      skillIds.length > 0
        ? await db().query.skill.findMany({
            where: sql`${skill.id} IN (${sql.raw(skillIds.map((id) => `'${id}'`).join(","))})`,
          })
        : []

    const rulesData =
      ruleIds.length > 0
        ? await db().query.rule.findMany({
            where: sql`${rule.id} IN (${sql.raw(ruleIds.map((id) => `'${id}'`).join(","))})`,
          })
        : []

    const skillNameMap = new Map(skillsData.map((s) => [s.id, s.name]))
    const ruleNameMap = new Map(rulesData.map((r) => [r.id, r.name]))

    const totalEvaluations = evaluationList.length
    const averageRating =
      totalEvaluations > 0
        ? evaluationList.reduce((sum, e) => sum + e.rating, 0) /
          totalEvaluations
        : 0

    return c.json({
      data: {
        totalEvaluations,
        averageRating: Math.round(averageRating * 100) / 100,
        skillEffectiveness: Object.entries(skillEffectiveness)
          .map(([id, stats]) => ({
            id,
            name: skillNameMap.get(id) || "Unknown",
            averageRating:
              Math.round((stats.totalRating / stats.count) * 100) / 100,
            evaluationCount: stats.count,
          }))
          .sort((a, b) => b.averageRating - a.averageRating),
        ruleEffectiveness: Object.entries(ruleEffectiveness)
          .map(([id, stats]) => ({
            id,
            name: ruleNameMap.get(id) || "Unknown",
            averageRating:
              Math.round((stats.totalRating / stats.count) * 100) / 100,
            evaluationCount: stats.count,
          }))
          .sort((a, b) => b.averageRating - a.averageRating),
      },
    })
  }
)

export default evaluations
