"use client"

import { useState } from "react"
import { Server, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react"

export interface NamespaceServer {
  id: string
  serverId: string
  name: string
  description?: string | null
  status: "online" | "offline" | "unknown"
  enabled: boolean
}

interface NamespaceServerListProps {
  servers: NamespaceServer[]
  onRemove: (serverId: string) => Promise<void>
  onToggleEnabled: (serverId: string, enabled: boolean) => Promise<void>
}

export function NamespaceServerList({
  servers,
  onRemove,
  onToggleEnabled,
}: NamespaceServerListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleRemove = async (serverId: string) => {
    setRemovingId(serverId)
    try {
      await onRemove(serverId)
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleToggle = async (serverId: string, currentEnabled: boolean) => {
    setTogglingId(serverId)
    try {
      await onToggleEnabled(serverId, !currentEnabled)
    } finally {
      setTogglingId(null)
    }
  }

  const getStatusColor = (status: NamespaceServer["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusLabel = (status: NamespaceServer["status"]) => {
    switch (status) {
      case "online":
        return "Online"
      case "offline":
        return "Offline"
      default:
        return "Unknown"
    }
  }

  if (servers.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Server className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No servers in this namespace
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Add MCP servers to this namespace to organize your tools.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-200">
        {servers.map((server) => (
          <li key={server.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Server className="h-5 w-5 text-gray-600" />
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusColor(server.status)}`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{server.name}</p>
                    {!server.enabled && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${getStatusColor(server.status)}`}
                    />
                    {getStatusLabel(server.status)}
                    {server.description && (
                      <>
                        <span className="text-gray-300">|</span>
                        {server.description}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Enable/Disable toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(server.serverId, server.enabled)}
                  disabled={togglingId === server.serverId}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title={server.enabled ? "Disable server" : "Enable server"}
                >
                  {togglingId === server.serverId ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : server.enabled ? (
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                {/* Remove button */}
                {confirmRemoveId === server.serverId ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemove(server.serverId)}
                      disabled={removingId === server.serverId}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingId === server.serverId ? "..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(server.serverId)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Remove from namespace"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
