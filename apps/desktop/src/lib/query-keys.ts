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
} as const

export type QueryKeys = typeof queryKeys
