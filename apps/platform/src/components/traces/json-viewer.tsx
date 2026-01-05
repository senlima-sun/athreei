"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

/**
 * Props for the JsonViewer component
 */
interface JsonViewerProps {
  /** The JSON data to display */
  data: unknown
  /** Optional label displayed above the JSON viewer */
  label?: string
  /** Whether to expand the JSON by default (defaults to true) */
  defaultExpanded?: boolean
}

/**
 * A component that displays JSON data in a formatted, collapsible viewer.
 *
 * @example
 * ```tsx
 * <JsonViewer data={{ name: "John", age: 30 }} label="User Data" />
 * <JsonViewer data={apiResponse} label="API Response" defaultExpanded={false} />
 * ```
 */
export function JsonViewer({
  data,
  label,
  defaultExpanded = true,
}: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (data == null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        {label && (
          <h3 className="mb-2 text-sm font-medium text-gray-700">{label}</h3>
        )}
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    )
  }

  const hasLabel = Boolean(label)

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      {hasLabel && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between border-b border-gray-200 px-4 py-2 text-left hover:bg-gray-100"
        >
          <h3 className="text-sm font-medium text-gray-700">{label}</h3>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      )}
      {(isExpanded || !hasLabel) && (
        <pre className="overflow-x-auto p-4 text-sm text-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
