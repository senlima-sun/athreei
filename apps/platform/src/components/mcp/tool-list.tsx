"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Wrench, AlertCircle } from "lucide-react"
import { ToolCard, type Tool } from "./tool-card"
import { ToolEditModal } from "./tool-edit-modal"
import { API_URL } from "@/constants"

interface ToolListProps {
  serverId: string
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Tool[] }
  | { status: "error"; error: string }

export function ToolList({ serverId }: ToolListProps) {
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" })
  const [editingTool, setEditingTool] = useState<Tool | null>(null)

  const fetchTools = useCallback(async () => {
    setFetchState({ status: "loading" })
    try {
      const response = await fetch(
        `${API_URL}/api/tools?serverId=${serverId}`,
        {
          credentials: "include",
        }
      )
      if (!response.ok) {
        throw new Error("Failed to fetch tools")
      }
      const data = await response.json()
      setFetchState({ status: "success", data: data.tools ?? [] })
    } catch (err) {
      setFetchState({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }, [serverId])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  const handleToggleEnabled = async (toolId: string, enabled: boolean) => {
    // Optimistic update
    if (fetchState.status === "success") {
      setFetchState({
        status: "success",
        data: fetchState.data.map((tool) =>
          tool.id === toolId ? { ...tool, isEnabled: enabled } : tool
        ),
      })
    }

    try {
      const response = await fetch(`${API_URL}/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to update tool")
      }
    } catch (err) {
      fetchTools()
      console.error("Failed to toggle tool:", err)
    }
  }

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool)
  }

  const handleSave = async (
    toolId: string,
    updates: { customDescription: string | null; customPrompt: string | null }
  ) => {
    try {
      const response = await fetch(`${API_URL}/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update tool")
      }

      await fetchTools()
      setEditingTool(null)
    } catch (err) {
      console.error("Failed to save tool:", err)
      throw err
    }
  }

  const handleCloseModal = () => {
    setEditingTool(null)
  }

  // Loading state
  if (fetchState.status === "idle" || fetchState.status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading tools...</span>
      </div>
    )
  }

  if (fetchState.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <h3 className="mt-3 text-sm font-medium text-red-800">
          Failed to load tools
        </h3>
        <p className="mt-1 text-sm text-red-600">{fetchState.error}</p>
        <button
          type="button"
          onClick={fetchTools}
          className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          Try again
        </button>
      </div>
    )
  }

  // Empty state
  if (fetchState.data.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <Wrench className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No tools</h3>
        <p className="mt-2 text-sm text-gray-500">
          This MCP server doesn't have any tools registered yet.
        </p>
      </div>
    )
  }

  // Success state with tools
  return (
    <>
      <div className="space-y-3">
        {fetchState.data.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onToggleEnabled={handleToggleEnabled}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {editingTool && (
        <ToolEditModal
          tool={editingTool}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </>
  )
}
