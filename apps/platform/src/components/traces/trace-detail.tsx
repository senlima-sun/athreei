"use client"

import Link from "next/link"
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Server,
  Wrench,
  BookOpen,
  Scale,
} from "lucide-react"
import type { Trace } from "@/types"
import { formatDuration, formatTime } from "@/utils"
import { JsonViewer } from "@/components/traces/json-viewer"

interface TraceDetailProps {
  trace: Trace
}

export function TraceDetail({ trace }: TraceDetailProps) {
  const toolName =
    trace.attributes?.toolName ||
    trace.attributes?.aggregatedToolName ||
    trace.name
  const serverName = trace.attributes?.serverName

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`mt-1 rounded-full p-2 ${
              trace.status === "success"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {trace.status === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trace.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  trace.status === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {trace.status === "success" ? "Success" : "Error"}
              </span>
              <span className="text-sm text-gray-500">
                {formatTime(trace.startTime)}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/traces"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to traces
        </Link>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Duration
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatDuration(trace.durationMs)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Wrench className="h-4 w-4" />
            Tool
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">{toolName}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Server className="h-4 w-4" />
            Server
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {serverName || "-"}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Trace ID</div>
          <p
            className="mt-1 truncate font-mono text-sm text-gray-900"
            title={trace.traceId}
          >
            {trace.traceId.slice(0, 16)}...
          </p>
        </div>
      </div>

      {/* Error Message */}
      {trace.statusMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-800">
            <XCircle className="h-4 w-4" />
            Error Message
          </h3>
          <pre className="whitespace-pre-wrap text-sm text-red-700">
            {trace.statusMessage}
          </pre>
        </div>
      )}

      {/* Active Skills and Rules */}
      {((trace.activeSkills && trace.activeSkills.length > 0) ||
        (trace.activeRules && trace.activeRules.length > 0)) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Active Skills */}
          {trace.activeSkills && trace.activeSkills.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-800">
                <BookOpen className="h-4 w-4" />
                Active Skills ({trace.activeSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {trace.activeSkills.map((skill) => (
                  <Link
                    key={skill.id}
                    href={`/dashboard/skills/${skill.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {skill.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active Rules */}
          {trace.activeRules && trace.activeRules.length > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-800">
                <Scale className="h-4 w-4" />
                Active Rules ({trace.activeRules.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {trace.activeRules
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule) => (
                    <Link
                      key={rule.id}
                      href={`/dashboard/rules/${rule.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      {rule.name}
                      <span className="ml-1 rounded bg-purple-200 px-1.5 py-0.5 text-xs">
                        #{rule.priority}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input/Output JSON Viewers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <JsonViewer
          data={trace.attributes?.arguments}
          label="Input (Arguments)"
        />
        <JsonViewer data={trace.attributes?.result} label="Output (Result)" />
      </div>

      {/* Events (if present) */}
      {trace.events && trace.events.length > 0 && (
        <JsonViewer data={trace.events} label="Events" />
      )}

      {/* Full Attributes (collapsible) */}
      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          View all attributes
        </summary>
        <div className="border-t border-gray-200 p-4">
          <pre className="overflow-x-auto text-sm text-gray-800">
            {JSON.stringify(trace.attributes, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  )
}
