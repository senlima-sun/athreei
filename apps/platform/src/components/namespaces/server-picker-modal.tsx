"use client"

import { useState } from "react"
import { X, Server, Search, Plus, Check } from "lucide-react"

export interface McpServer {
  id: string
  name: string
  description?: string | null
  status: "online" | "offline" | "unknown"
}

interface ServerPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (serverId: string) => Promise<void>
  availableServers: McpServer[]
  excludeServerIds?: string[]
}

export function ServerPickerModal({
  isOpen,
  onClose,
  onSelect,
  availableServers,
  excludeServerIds = [],
}: ServerPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredServers = availableServers.filter(
    (server) =>
      !excludeServerIds.includes(server.id) &&
      (server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelect = async (serverId: string) => {
    setIsAdding(serverId)
    try {
      await onSelect(serverId)
    } finally {
      setIsAdding(null)
    }
  }

  const getStatusColor = (status: McpServer["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Add MCP Server
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search servers..."
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Server list */}
        <div className="max-h-80 overflow-y-auto">
          {filteredServers.length === 0 ? (
            <div className="p-8 text-center">
              <Server className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">
                {searchQuery
                  ? "No servers match your search"
                  : "No servers available"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "Try a different search term"
                  : "All servers are already in this namespace"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredServers.map((server) => (
                <li
                  key={server.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Server className="h-5 w-5 text-gray-600" />
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusColor(server.status)}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{server.name}</p>
                      {server.description && (
                        <p className="text-sm text-gray-500">
                          {server.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(server.id)}
                    disabled={isAdding === server.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdding === server.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
