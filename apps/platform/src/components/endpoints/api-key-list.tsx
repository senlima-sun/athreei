"use client"

import { useState } from "react"
import { Key, Trash2, Loader2, AlertTriangle, BarChart3 } from "lucide-react"
import { fetchApi } from "@/lib/api"

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: Date
  lastUsedAt: Date | null
}

interface ApiKeyStats {
  totalUsage: number
  last7Days: Array<{ date: string; count: number; errors: number }>
  errorRate: number
  lastUsed: string | null
}

interface ApiKeyListProps {
  apiKeys: ApiKey[]
  endpointId: string
  onRevoke: (keyId: string) => Promise<void>
}

export function ApiKeyList({ apiKeys, endpointId, onRevoke }: ApiKeyListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, ApiKeyStats>>({})
  const [loadingStatsId, setLoadingStatsId] = useState<string | null>(null)

  const handleRevoke = async (keyId: string) => {
    setRevokingId(keyId)
    try {
      await onRevoke(keyId)
    } finally {
      setRevokingId(null)
      setShowConfirmId(null)
    }
  }

  const handleToggleStats = async (keyId: string) => {
    if (expandedId === keyId) {
      setExpandedId(null)
      return
    }

    setExpandedId(keyId)

    if (!stats[keyId]) {
      setLoadingStatsId(keyId)
      try {
        const result = await fetchApi<ApiKeyStats>(
          `/api/api-keys/${endpointId}/keys/${keyId}/stats`
        )
        setStats((prev) => ({ ...prev, [keyId]: result }))
      } catch {
        // Silently fail - stats are optional
      } finally {
        setLoadingStatsId(null)
      }
    }
  }

  const maskKey = (prefix: string) => {
    return `${prefix}${"*".repeat(32)}`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Key className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No API keys yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Create an API key to authenticate requests to this endpoint.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {apiKeys.map((apiKey) => {
        const keyStats = stats[apiKey.id]
        const isExpanded = expandedId === apiKey.id
        const isLoadingStats = loadingStatsId === apiKey.id

        return (
          <div key={apiKey.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Key className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{apiKey.name}</p>
                  <code className="font-mono text-sm text-gray-500">
                    {maskKey(apiKey.keyPrefix)}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-gray-500">
                    Created {formatDate(apiKey.createdAt)}
                  </p>
                  <p className="text-gray-400">
                    Last used {formatDate(apiKey.lastUsedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStats(apiKey.id)}
                  className={`rounded p-1.5 ${
                    isExpanded
                      ? "bg-gray-100 text-gray-700"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                  title="View usage stats"
                >
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                </button>

                {showConfirmId === apiKey.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRevoke(apiKey.id)}
                      disabled={revokingId === apiKey.id}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {revokingId === apiKey.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmId(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmId(apiKey.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Revoke API key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Usage Stats Panel */}
            {isExpanded && (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : keyStats ? (
                  <div className="space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Total Usage</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {keyStats.totalUsage.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Error Rate</p>
                        <p
                          className={`text-lg font-semibold ${
                            keyStats.errorRate > 5
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {keyStats.errorRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Used</p>
                        <p className="text-sm text-gray-900">
                          {keyStats.lastUsed
                            ? new Date(keyStats.lastUsed).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    {/* Usage chart (simple bar visualization) */}
                    {keyStats.last7Days.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs text-gray-500">
                          Last 7 days
                        </p>
                        <div className="flex items-end gap-1">
                          {keyStats.last7Days.map((day) => {
                            const maxCount = Math.max(
                              ...keyStats.last7Days.map((d) => d.count)
                            )
                            const height =
                              maxCount > 0
                                ? Math.max((day.count / maxCount) * 40, 4)
                                : 4

                            return (
                              <div
                                key={day.date}
                                className="flex flex-1 flex-col items-center"
                                title={`${day.date}: ${day.count} requests, ${day.errors} errors`}
                              >
                                <div
                                  className={`w-full rounded-t ${
                                    day.errors > 0
                                      ? "bg-red-400"
                                      : "bg-gray-400"
                                  }`}
                                  style={{ height: `${height}px` }}
                                />
                                <span className="mt-1 text-[10px] text-gray-400">
                                  {day.date.slice(5)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-2 text-center text-sm text-gray-500">
                    No usage data available
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
