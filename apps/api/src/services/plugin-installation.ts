import { eq, and, sql, desc } from "drizzle-orm"
import { db } from "../lib/db-operations"
import {
  marketplace,
  plugin,
  pluginVersion,
  pluginInstallation,
  pluginComponent,
  organizationMarketplaceSetting,
  member,
  skill,
  rule,
  namespaceHook,
} from "@athreei/db"
import {
  generatePluginInstallationId,
  generateSkillId,
  generateRuleId,
  generateNamespaceHookId,
} from "./id-generator"
import { getOrgMarketplaceRestrictions } from "./plugin-discovery"
import type {
  InstallPluginInput,
  UpdateInstallationInput,
  ListInstallationsQuery,
} from "../schemas/marketplaces"

export interface InstallationResult {
  id: string
  organizationId: string
  pluginId: string
  pluginVersionId: string
  installedBy: string | null
  scope: string
  status: string
  config: unknown
  installedAt: Date
  updatedAt: Date
  plugin: {
    id: string
    slug: string
    name: string
    marketplace: {
      id: string
      slug: string
      name: string
    }
  }
  version: {
    id: string
    version: string
  }
}

export async function checkInstallationRestrictions(
  organizationId: string,
  marketplaceId: string,
  pluginId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const restrictions = await getOrgMarketplaceRestrictions(organizationId)

  if (!restrictions) {
    return { allowed: true }
  }

  if (restrictions.restrictMarketplaces) {
    if (restrictions.allowedMarketplaceIds.length === 0) {
      return {
        allowed: false,
        reason: "No marketplaces are allowed for your organization",
      }
    }
    if (!restrictions.allowedMarketplaceIds.includes(marketplaceId)) {
      return {
        allowed: false,
        reason: "This marketplace is not allowed for your organization",
      }
    }
  }

  if (restrictions.restrictPlugins) {
    if (restrictions.allowedPluginIds.length === 0) {
      return {
        allowed: false,
        reason: "No plugins are allowed for your organization",
      }
    }
    if (!restrictions.allowedPluginIds.includes(pluginId)) {
      return {
        allowed: false,
        reason: "This plugin is not allowed for your organization",
      }
    }
  }

  const settings = await db().query.organizationMarketplaceSetting.findFirst({
    where: eq(organizationMarketplaceSetting.organizationId, organizationId),
  })

  if (settings?.requireApproval) {
    const membership = await db().query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      ),
    })

    if (membership?.role !== "admin") {
      return {
        allowed: false,
        reason: "Plugin installation requires admin approval",
      }
    }
  }

  return { allowed: true }
}

export async function installPlugin(
  organizationId: string,
  userId: string,
  input: InstallPluginInput
): Promise<InstallationResult> {
  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, input.marketplaceSlug),
  })

  if (!mkt) {
    throw new Error("Marketplace not found")
  }

  const plg = await db().query.plugin.findFirst({
    where: and(
      eq(plugin.marketplaceId, mkt.id),
      eq(plugin.slug, input.pluginSlug)
    ),
  })

  if (!plg) {
    throw new Error("Plugin not found")
  }

  const restrictionCheck = await checkInstallationRestrictions(
    organizationId,
    mkt.id,
    plg.id,
    userId
  )

  if (!restrictionCheck.allowed) {
    throw new Error(restrictionCheck.reason)
  }

  let version: typeof pluginVersion.$inferSelect | undefined

  if (input.version) {
    version = await db().query.pluginVersion.findFirst({
      where: and(
        eq(pluginVersion.pluginId, plg.id),
        eq(pluginVersion.version, input.version)
      ),
    })
    if (!version) {
      throw new Error(`Version ${input.version} not found`)
    }
  } else {
    version = await db().query.pluginVersion.findFirst({
      where: and(
        eq(pluginVersion.pluginId, plg.id),
        eq(pluginVersion.isLatest, true)
      ),
    })
    if (!version) {
      throw new Error("No version available for this plugin")
    }
  }

  const existingInstallation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.organizationId, organizationId),
      eq(pluginInstallation.pluginId, plg.id),
      eq(pluginInstallation.scope, input.scope)
    ),
  })

  if (existingInstallation) {
    throw new Error("Plugin is already installed with this scope")
  }

  const now = new Date()
  const id = generatePluginInstallationId()

  let encryptedEnv: string | null = null
  if (input.envValues && Object.keys(input.envValues).length > 0) {
    encryptedEnv = JSON.stringify(input.envValues)
  }

  await db()
    .insert(pluginInstallation)
    .values({
      id,
      organizationId,
      pluginId: plg.id,
      pluginVersionId: version.id,
      installedBy: userId,
      scope: input.scope,
      status: "active",
      config: input.config ? JSON.stringify(input.config) : null,
      encryptedEnv,
      envKeyVersion: encryptedEnv ? 1 : null,
      installedAt: now,
      updatedAt: now,
    })

  await db()
    .update(plugin)
    .set({
      downloadCount: sql`CAST(${plugin.downloadCount} AS INTEGER) + 1`,
    })
    .where(eq(plugin.id, plg.id))

  return {
    id,
    organizationId,
    pluginId: plg.id,
    pluginVersionId: version.id,
    installedBy: userId,
    scope: input.scope,
    status: "active",
    config: input.config || null,
    installedAt: now,
    updatedAt: now,
    plugin: {
      id: plg.id,
      slug: plg.slug,
      name: plg.name,
      marketplace: {
        id: mkt.id,
        slug: mkt.slug,
        name: mkt.name,
      },
    },
    version: {
      id: version.id,
      version: version.version,
    },
  }
}

export async function uninstallPlugin(
  organizationId: string,
  installationId: string,
  userId: string
): Promise<void> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    throw new Error("Installation not found")
  }

  if (installation.scope === "user" && installation.installedBy !== userId) {
    throw new Error("You can only uninstall your own user-scoped installations")
  }

  if (installation.scope === "organization") {
    const membership = await db().query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      ),
    })

    if (membership?.role !== "admin") {
      throw new Error("Only admins can uninstall organization-scoped plugins")
    }
  }

  await db()
    .delete(pluginInstallation)
    .where(eq(pluginInstallation.id, installationId))
}

export async function updateInstallation(
  organizationId: string,
  installationId: string,
  userId: string,
  updates: UpdateInstallationInput
): Promise<InstallationResult> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    throw new Error("Installation not found")
  }

  if (installation.scope === "user" && installation.installedBy !== userId) {
    throw new Error("You can only update your own user-scoped installations")
  }

  if (installation.scope === "organization") {
    const membership = await db().query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      ),
    })

    if (membership?.role !== "admin") {
      throw new Error("Only admins can update organization-scoped plugins")
    }
  }

  const updateData: Partial<typeof pluginInstallation.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (updates.status !== undefined) {
    updateData.status = updates.status
  }

  if (updates.config !== undefined) {
    updateData.config = JSON.stringify(updates.config)
  }

  if (updates.envValues !== undefined) {
    updateData.encryptedEnv = JSON.stringify(updates.envValues)
    updateData.envKeyVersion = 1
  }

  await db()
    .update(pluginInstallation)
    .set(updateData)
    .where(eq(pluginInstallation.id, installationId))

  const updated = await db().query.pluginInstallation.findFirst({
    where: eq(pluginInstallation.id, installationId),
  })

  const plg = await db().query.plugin.findFirst({
    where: eq(plugin.id, updated!.pluginId),
  })

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.id, plg!.marketplaceId),
  })

  const ver = await db().query.pluginVersion.findFirst({
    where: eq(pluginVersion.id, updated!.pluginVersionId),
  })

  return {
    id: updated!.id,
    organizationId: updated!.organizationId,
    pluginId: updated!.pluginId,
    pluginVersionId: updated!.pluginVersionId,
    installedBy: updated!.installedBy,
    scope: updated!.scope,
    status: updated!.status,
    config: updated!.config ? JSON.parse(updated!.config) : null,
    installedAt: updated!.installedAt,
    updatedAt: updated!.updatedAt,
    plugin: {
      id: plg!.id,
      slug: plg!.slug,
      name: plg!.name,
      marketplace: {
        id: mkt!.id,
        slug: mkt!.slug,
        name: mkt!.name,
      },
    },
    version: {
      id: ver!.id,
      version: ver!.version,
    },
  }
}

export async function updateInstallationVersion(
  organizationId: string,
  installationId: string,
  userId: string,
  targetVersion?: string
): Promise<InstallationResult> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    throw new Error("Installation not found")
  }

  if (installation.scope === "user" && installation.installedBy !== userId) {
    throw new Error(
      "You can only update versions for your own user-scoped installations"
    )
  }

  if (installation.scope === "organization") {
    const membership = await db().query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId)
      ),
    })

    if (membership?.role !== "admin") {
      throw new Error(
        "Only admins can update versions for organization-scoped plugins"
      )
    }
  }

  let newVersion: typeof pluginVersion.$inferSelect | undefined

  if (targetVersion) {
    newVersion = await db().query.pluginVersion.findFirst({
      where: and(
        eq(pluginVersion.pluginId, installation.pluginId),
        eq(pluginVersion.version, targetVersion)
      ),
    })
    if (!newVersion) {
      throw new Error(`Version ${targetVersion} not found`)
    }
  } else {
    newVersion = await db().query.pluginVersion.findFirst({
      where: and(
        eq(pluginVersion.pluginId, installation.pluginId),
        eq(pluginVersion.isLatest, true)
      ),
    })
    if (!newVersion) {
      throw new Error("No newer version available")
    }
  }

  if (newVersion.id === installation.pluginVersionId) {
    throw new Error("Already on the specified version")
  }

  await db()
    .update(pluginInstallation)
    .set({
      pluginVersionId: newVersion.id,
      updatedAt: new Date(),
    })
    .where(eq(pluginInstallation.id, installationId))

  return updateInstallation(organizationId, installationId, userId, {})
}

export async function listInstallations(
  organizationId: string,
  query: ListInstallationsQuery
): Promise<{
  data: InstallationResult[]
  pagination: { limit: number; offset: number; total: number; hasMore: boolean }
}> {
  const limit = Math.min(Math.max(query.limit || 20, 1), 100)
  const offset = Math.max(query.offset || 0, 0)

  const conditions: ReturnType<typeof eq>[] = [
    eq(pluginInstallation.organizationId, organizationId),
  ]

  if (query.status) {
    conditions.push(eq(pluginInstallation.status, query.status))
  }

  if (query.scope) {
    conditions.push(eq(pluginInstallation.scope, query.scope))
  }

  const whereClause = and(...conditions)

  const [installations, countResult] = await Promise.all([
    db()
      .select({
        id: pluginInstallation.id,
        organizationId: pluginInstallation.organizationId,
        pluginId: pluginInstallation.pluginId,
        pluginVersionId: pluginInstallation.pluginVersionId,
        installedBy: pluginInstallation.installedBy,
        scope: pluginInstallation.scope,
        status: pluginInstallation.status,
        config: pluginInstallation.config,
        installedAt: pluginInstallation.installedAt,
        updatedAt: pluginInstallation.updatedAt,
        pluginSlug: plugin.slug,
        pluginName: plugin.name,
        marketplaceId: marketplace.id,
        marketplaceSlug: marketplace.slug,
        marketplaceName: marketplace.name,
        versionId: pluginVersion.id,
        versionNumber: pluginVersion.version,
      })
      .from(pluginInstallation)
      .innerJoin(plugin, eq(pluginInstallation.pluginId, plugin.id))
      .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
      .innerJoin(
        pluginVersion,
        eq(pluginInstallation.pluginVersionId, pluginVersion.id)
      )
      .where(whereClause)
      .orderBy(desc(pluginInstallation.installedAt))
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(pluginInstallation)
      .where(whereClause),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  const data: InstallationResult[] = installations.map((i) => ({
    id: i.id,
    organizationId: i.organizationId,
    pluginId: i.pluginId,
    pluginVersionId: i.pluginVersionId,
    installedBy: i.installedBy,
    scope: i.scope,
    status: i.status,
    config: i.config ? JSON.parse(i.config) : null,
    installedAt: i.installedAt,
    updatedAt: i.updatedAt,
    plugin: {
      id: i.pluginId,
      slug: i.pluginSlug,
      name: i.pluginName,
      marketplace: {
        id: i.marketplaceId,
        slug: i.marketplaceSlug,
        name: i.marketplaceName,
      },
    },
    version: {
      id: i.versionId,
      version: i.versionNumber,
    },
  }))

  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + data.length < total,
    },
  }
}

export async function getDecryptedEnv(
  organizationId: string,
  installationId: string
): Promise<Record<string, string>> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    throw new Error("Installation not found")
  }

  if (!installation.encryptedEnv) {
    return {}
  }

  return JSON.parse(installation.encryptedEnv)
}

interface SkillComponentConfig {
  name: string
  description?: string
  content: string
  tags?: string[]
  allowedTools?: string[]
  triggerPatterns?: string[]
}

interface RuleComponentConfig {
  name: string
  description?: string
  content: string
  priority?: number
  scope?: "global" | "namespace" | "endpoint"
}

interface HookComponentConfig {
  event: string
  toolNamePattern?: string
  handler: unknown
  priority?: number
}

export async function syncPluginComponentsToNamespace(
  installationId: string,
  namespaceId: string,
  organizationId: string
): Promise<{
  skillsCreated: number
  rulesCreated: number
  hooksCreated: number
}> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    throw new Error("Installation not found")
  }

  const components = await db().query.pluginComponent.findMany({
    where: eq(pluginComponent.pluginVersionId, installation.pluginVersionId),
  })

  const now = new Date()
  let skillsCreated = 0
  let rulesCreated = 0
  let hooksCreated = 0

  for (const component of components) {
    const config = component.config ? JSON.parse(component.config) : {}

    switch (component.type) {
      case "skill": {
        if (config.content) {
          const skillConfig = config as SkillComponentConfig
          const skillId = `${installation.pluginId}_${component.name}`

          const existingSkill = await db().query.skill.findFirst({
            where: and(
              eq(skill.id, skillId),
              eq(skill.organizationId, organizationId)
            ),
          })

          if (existingSkill) {
            await db()
              .update(skill)
              .set({
                name: skillConfig.name,
                description: skillConfig.description || null,
                content: skillConfig.content,
                tags: skillConfig.tags ? JSON.stringify(skillConfig.tags) : null,
                updatedAt: now,
              })
              .where(eq(skill.id, skillId))
          } else {
            await db().insert(skill).values({
              id: skillId,
              organizationId,
              name: skillConfig.name,
              description: skillConfig.description || null,
              content: skillConfig.content,
              tags: skillConfig.tags ? JSON.stringify(skillConfig.tags) : null,
              isEnabled: "true",
              version: 1,
              createdAt: now,
              updatedAt: now,
            })
            skillsCreated++
          }
        }
        break
      }

      case "rule": {
        if (config.content) {
          const ruleConfig = config as RuleComponentConfig
          const ruleId = `${installation.pluginId}_${component.name}`

          const existingRule = await db().query.rule.findFirst({
            where: and(
              eq(rule.id, ruleId),
              eq(rule.organizationId, organizationId)
            ),
          })

          if (existingRule) {
            await db()
              .update(rule)
              .set({
                name: ruleConfig.name,
                description: ruleConfig.description || null,
                content: ruleConfig.content,
                priority: ruleConfig.priority ?? 100,
                scope: ruleConfig.scope ?? "namespace",
                updatedAt: now,
              })
              .where(eq(rule.id, ruleId))
          } else {
            await db().insert(rule).values({
              id: ruleId,
              organizationId,
              name: ruleConfig.name,
              description: ruleConfig.description || null,
              content: ruleConfig.content,
              priority: ruleConfig.priority ?? 100,
              scope: ruleConfig.scope ?? "namespace",
              isEnabled: "true",
              createdAt: now,
              updatedAt: now,
            })
            rulesCreated++
          }
        }
        break
      }

      case "hook": {
        const hookConfig = config as HookComponentConfig
        if (hookConfig.event && hookConfig.handler) {
          const hookId = `${installation.pluginId}_${component.name}`

          const existingHook = await db().query.namespaceHook.findFirst({
            where: and(
              eq(namespaceHook.id, hookId),
              eq(namespaceHook.namespaceId, namespaceId)
            ),
          })

          if (existingHook) {
            await db()
              .update(namespaceHook)
              .set({
                event: hookConfig.event,
                toolNamePattern: hookConfig.toolNamePattern || null,
                handler: JSON.stringify(hookConfig.handler),
                priority: hookConfig.priority ?? 100,
                updatedAt: now,
              })
              .where(eq(namespaceHook.id, hookId))
          } else {
            await db().insert(namespaceHook).values({
              id: hookId,
              namespaceId,
              event: hookConfig.event,
              toolNamePattern: hookConfig.toolNamePattern || null,
              handler: JSON.stringify(hookConfig.handler),
              priority: hookConfig.priority ?? 100,
              isEnabled: true,
              sourcePluginId: installation.pluginId,
              createdAt: now,
              updatedAt: now,
            })
            hooksCreated++
          }
        }
        break
      }
    }
  }

  return { skillsCreated, rulesCreated, hooksCreated }
}

export async function removePluginComponentsFromNamespace(
  installationId: string,
  namespaceId: string,
  organizationId: string
): Promise<void> {
  const installation = await db().query.pluginInstallation.findFirst({
    where: and(
      eq(pluginInstallation.id, installationId),
      eq(pluginInstallation.organizationId, organizationId)
    ),
  })

  if (!installation) {
    return
  }

  await db()
    .delete(namespaceHook)
    .where(
      and(
        eq(namespaceHook.namespaceId, namespaceId),
        eq(namespaceHook.sourcePluginId, installation.pluginId)
      )
    )
}
