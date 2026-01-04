"use client"

import { useState } from "react"
import { X, RotateCcw, Loader2, Wrench } from "lucide-react"
import type { Tool } from "./tool-card"

interface ToolEditModalProps {
  tool: Tool
  onClose: () => void
  onSave: (
    toolId: string,
    updates: { customDescription: string | null; customPrompt: string | null }
  ) => Promise<void>
}

const MAX_DESCRIPTION_LENGTH = 2000
const MAX_PROMPT_LENGTH = 5000

export function ToolEditModal({ tool, onClose, onSave }: ToolEditModalProps) {
  const [customDescription, setCustomDescription] = useState(
    tool.customDescription ?? ""
  )
  const [customPrompt, setCustomPrompt] = useState(tool.customPrompt ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges =
    customDescription !== (tool.customDescription ?? "") ||
    customPrompt !== (tool.customPrompt ?? "")

  const canReset = customDescription !== "" || customPrompt !== ""

  const handleReset = () => {
    setCustomDescription("")
    setCustomPrompt("")
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      await onSave(tool.id, {
        customDescription: customDescription.trim() || null,
        customPrompt: customPrompt.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <Wrench className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Tool Configuration
              </h2>
              <p className="text-sm text-gray-500">{tool.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Original Description (read-only) */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Original Description
            </label>
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {tool.description ?? (
                <span className="italic text-gray-400">No description</span>
              )}
            </div>
          </div>

          {/* Custom Description */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="customDescription"
                className="block text-sm font-medium text-gray-700"
              >
                Custom Description
              </label>
              <span className="text-xs text-gray-400">
                {customDescription.length} / {MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              id="customDescription"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:opacity-50"
              placeholder="Override the tool description shown to the AI..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This description will be shown to the AI instead of the original.
            </p>
          </div>

          {/* Custom Prompt */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="customPrompt"
                className="block text-sm font-medium text-gray-700"
              >
                Custom Prompt
              </label>
              <span className="text-xs text-gray-400">
                {customPrompt.length} / {MAX_PROMPT_LENGTH}
              </span>
            </div>
            <textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              maxLength={MAX_PROMPT_LENGTH}
              rows={6}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:opacity-50"
              placeholder="Add additional instructions or context for this tool..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Additional instructions that will be included when this tool is
              available to the AI.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={!canReset || isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
