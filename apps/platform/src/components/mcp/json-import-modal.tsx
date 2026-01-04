"use client"

import { useState } from "react"
import { X, FileJson, AlertCircle, CheckCircle } from "lucide-react"
import {
  parseMcpConfig,
  type ParsedMcpServer,
} from "@/lib/mcp-config-parser"

interface JsonImportModalProps {
  onClose: () => void
  onImport: (servers: ParsedMcpServer[]) => void
}

export function JsonImportModal({ onClose, onImport }: JsonImportModalProps) {
  const [jsonInput, setJsonInput] = useState("")
  const [parseResult, setParseResult] = useState<{
    success: boolean
    servers: ParsedMcpServer[]
    error?: string
  } | null>(null)

  const handleParse = () => {
    const result = parseMcpConfig(jsonInput)
    setParseResult(result)
  }

  const handleImport = () => {
    if (parseResult?.success && parseResult.servers.length > 0) {
      onImport(parseResult.servers)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileJson className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Import from JSON
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="mb-4 text-sm text-gray-600">
            Paste your MCP configuration JSON from Claude Desktop, Cursor, or
            any MCP-compatible app. We'll parse it and help you set up the
            servers.
          </p>

          <div className="mb-4">
            <label
              htmlFor="jsonConfig"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Configuration JSON
            </label>
            <textarea
              id="jsonConfig"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                setParseResult(null)
              }}
              rows={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder={`{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-token"
      }
    }
  }
}`}
            />
          </div>

          {/* Parse button */}
          {!parseResult && (
            <button
              type="button"
              onClick={handleParse}
              disabled={!jsonInput.trim()}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Parse Configuration
            </button>
          )}

          {/* Parse result */}
          {parseResult && (
            <div
              className={`rounded-lg border p-4 ${
                parseResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              {parseResult.success ? (
                <div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      Found {parseResult.servers.length} server
                      {parseResult.servers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {parseResult.servers.map((server, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded bg-white px-3 py-2"
                      >
                        <span className="font-medium text-gray-900">
                          {server.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {server.transport.toUpperCase()}
                          {server.envVars.length > 0 &&
                            ` • ${server.envVars.length} env vars`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{parseResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!parseResult?.success || parseResult.servers.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Import {parseResult?.servers.length || 0} Server
            {(parseResult?.servers.length || 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
