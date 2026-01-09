export const ID_PREFIXES = {
  namespace: "ns_",
  namespaceResource: "nsr_",
  endpoint: "ep_",
  trace: "tr_",
  apiKey: "ak_",
  cliAuthSession: "cas_",
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
