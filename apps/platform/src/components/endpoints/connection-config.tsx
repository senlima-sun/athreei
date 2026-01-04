"use client"

import { useState } from "react"
import { CopyButton } from "./copy-button"
import { Terminal, FileJson } from "lucide-react"

interface ConnectionConfigProps {
  endpointName: string
  endpointSlug: string
}

export function ConnectionConfig({
  endpointName,
  endpointSlug,
}: ConnectionConfigProps) {
  const connectionUrl = `https://athreei.com/mcp/${endpointSlug}/sse`

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [endpointSlug]: {
          url: connectionUrl,
          transport: "sse",
        },
      },
    },
    null,
    2
  )

  const [activeTab, setActiveTab] = useState<"url" | "config">("url")

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">
          Connection Details
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Use these details to connect your AI app to this endpoint.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            activeTab === "url"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Terminal className="h-4 w-4" />
          Connection URL
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            activeTab === "config"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileJson className="h-4 w-4" />
          Claude Desktop Config
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "url" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                SSE Endpoint URL
              </label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900">
                  {connectionUrl}
                </code>
                <CopyButton text={connectionUrl} label="Copy" />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Use this URL in any MCP-compatible client that supports SSE
              transport.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Configuration for Claude Desktop
              </label>
              <div className="mt-1 relative">
                <pre className="rounded-md bg-gray-100 p-3 font-mono text-sm text-gray-900 overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton text={claudeDesktopConfig} label="Copy" />
                </div>
              </div>
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              <p className="font-medium">How to use:</p>
              <ol className="mt-1 list-decimal pl-4 space-y-1">
                <li>Open Claude Desktop settings</li>
                <li>Navigate to the MCP Servers section</li>
                <li>Add this configuration to your existing config file</li>
                <li>Restart Claude Desktop</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
