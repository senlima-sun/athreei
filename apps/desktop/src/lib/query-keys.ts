export const queryKeys = {
  memories: {
    all: ["memories"] as const,
    list: (params?: { spaceId?: string; limit?: number; offset?: number }) =>
      ["memories", params ?? {}] as const,
    detail: (id: string) => ["memories", "detail", id] as const,
    count: (spaceId?: string) => ["memories", "count", spaceId] as const,
    search: (query: string, spaceId?: string) =>
      ["memories", "search", query, spaceId] as const,
  },

  spaces: {
    all: ["spaces"] as const,
    detail: (id: string) => ["spaces", id] as const,
    memoryCount: (spaceId: string) =>
      ["spaces", spaceId, "memoryCount"] as const,
  },

  tags: {
    all: ["tags"] as const,
  },

  vault: {
    all: ["vault"] as const,
    status: ["vault", "status"] as const,
    setup: ["vault", "setup"] as const,
  },

  mcp: {
    all: ["mcp"] as const,
    status: ["mcp", "status"] as const,
  },

  sync: {
    all: ["sync"] as const,
    status: ["sync", "status"] as const,
    config: ["sync", "config"] as const,
    conflicts: ["sync", "conflicts"] as const,
    pending: ["sync", "pending"] as const,
  },

  settings: {
    all: ["settings"] as const,
    databasePath: ["settings", "database-path"] as const,
    autoLock: ["settings", "auto-lock"] as const,
    launchAtStartup: ["settings", "launch-at-startup"] as const,
    shortcuts: ["settings", "shortcuts"] as const,
    dataRetention: ["settings", "data-retention"] as const,
    appInfo: ["settings", "app-info"] as const,
  },

  backup: {
    all: ["backup"] as const,
    info: (path: string) => ["backup", "info", path] as const,
  },

  stats: {
    all: ["stats"] as const,
  },

  workspaces: {
    all: ["workspaces"] as const,
    list: (params?: {
      spaceId?: string
      statuses?: string[]
      limit?: number
      offset?: number
    }) => ["workspaces", params ?? {}] as const,
    detail: (id: string) => ["workspaces", id] as const,
    count: (statuses?: string[]) => ["workspaces", "count", statuses] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    list: (workspaceId: string) => ["tasks", workspaceId] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
  },

  handoffs: {
    all: ["handoffs"] as const,
    list: (workspaceId: string, limit?: number) =>
      ["handoffs", workspaceId, limit] as const,
    detail: (id: string) => ["handoffs", "detail", id] as const,
    latest: (workspaceId: string) =>
      ["handoffs", "latest", workspaceId] as const,
  },

  embedding: {
    all: ["embedding"] as const,
    status: ["embedding", "status"] as const,
    downloaded: ["embedding", "downloaded"] as const,
    config: ["embedding", "config"] as const,
  },

  traces: {
    all: ["traces"] as const,
    analytics: (days?: number) => ["traces", "analytics", days] as const,
    sessions: (limit?: number, offset?: number) =>
      ["traces", "sessions", limit, offset] as const,
    session: (sessionId: string) => ["traces", "session", sessionId] as const,
    sessionTraces: (sessionId: string) =>
      ["traces", "sessionTraces", sessionId] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
