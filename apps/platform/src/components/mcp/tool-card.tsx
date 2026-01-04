"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  Wrench,
} from "lucide-react"

export interface Tool {
  id: string
  name: string
  description: string | null
  inputSchema: Record<string, unknown> | null
  customDescription: string | null
  customPrompt: string | null
  isEnabled: boolean
}

interface ToolCardProps {
  tool: Tool
  onToggleEnabled: (id: string, enabled: boolean) => void
  onEdit: (tool: Tool) => void
}

export function ToolCard({ tool, onToggleEnabled, onEdit }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)

  const displayDescription = tool.customDescription ?? tool.description
  const hasCustomDescription = tool.customDescription !== null

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-gray-100"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Wrench className="h-4 w-4 text-gray-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">
                {tool.name}
              </h3>
              {hasCustomDescription && (
                <span className="shrink-0 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Custom description
                </span>
              )}
              {!tool.isEnabled && (
                <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Disabled
                </span>
              )}
            </div>
            {displayDescription && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                {displayDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            type="button"
            onClick={() => onToggleEnabled(tool.id, !tool.isEnabled)}
            className={`flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 ${
              tool.isEnabled ? "text-gray-600" : "text-gray-400"
            }`}
            aria-label={tool.isEnabled ? "Disable tool" : "Enable tool"}
            title={tool.isEnabled ? "Disable tool" : "Enable tool"}
          >
            {tool.isEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onEdit(tool)}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-100"
            aria-label="Edit tool"
            title="Edit tool"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4">
          {/* Input Schema */}
          {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Input Schema
              </h4>
              <pre className="rounded-md bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 overflow-x-auto">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
          )}

          {/* Custom Prompt */}
          {tool.customPrompt && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Custom Prompt
              </h4>
              <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                {tool.customPrompt}
              </div>
            </div>
          )}

          {/* No additional info */}
          {!tool.inputSchema && !tool.customPrompt && (
            <p className="text-sm text-gray-500 italic">
              No additional configuration for this tool.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
