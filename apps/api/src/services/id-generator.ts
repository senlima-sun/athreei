export const ID_PREFIXES = {
  namespace: "ns_",
  namespaceResource: "nsr_",
  namespaceHook: "nh_",
  endpoint: "ep_",
  trace: "tr_",
  apiKey: "ak_",
  cliAuthSession: "cas_",
  marketplace: "mkt_",
  plugin: "plg_",
  pluginVersion: "pv_",
  pluginComponent: "pc_",
  pluginInstallation: "pi_",
  orgMarketplaceSetting: "oms_",
  skill: "sk_",
  rule: "rl_",
} as const

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]

export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  return prefix ? `${prefix}${uuid}` : uuid
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

export function generateNamespaceId(): string {
  return generateId(ID_PREFIXES.namespace)
}

export function generateNamespaceResourceId(): string {
  return generateId(ID_PREFIXES.namespaceResource)
}

export function generateEndpointId(): string {
  return generateId(ID_PREFIXES.endpoint)
}

export function generateTraceId(): string {
  return generateId(ID_PREFIXES.trace)
}

export function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}

export function generateSlug(name: string, maxLength = 50): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
}

export function generateMarketplaceId(): string {
  return generateId(ID_PREFIXES.marketplace)
}

export function generatePluginId(): string {
  return generateId(ID_PREFIXES.plugin)
}

export function generatePluginVersionId(): string {
  return generateId(ID_PREFIXES.pluginVersion)
}

export function generatePluginComponentId(): string {
  return generateId(ID_PREFIXES.pluginComponent)
}

export function generatePluginInstallationId(): string {
  return generateId(ID_PREFIXES.pluginInstallation)
}

export function generateOrgMarketplaceSettingId(): string {
  return generateId(ID_PREFIXES.orgMarketplaceSetting)
}

export function generateSkillId(): string {
  return generateId(ID_PREFIXES.skill)
}

export function generateRuleId(): string {
  return generateId(ID_PREFIXES.rule)
}

export function generateNamespaceHookId(): string {
  return generateId(ID_PREFIXES.namespaceHook)
}
