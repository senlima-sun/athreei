"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpTransportType } from "@/components/mcp";
import {
  Server,
  Terminal,
  Radio,
  Globe,
  ArrowLeft,
  Copy,
  Check,
  Download,
} from "lucide-react";
import { useState } from "react";

// Mock data - same as registry page
const mockRegistryServers = [
  {
    id: "1",
    name: "Browser Tools",
    description:
      "Expose browser capabilities to AI apps via Native Messaging. Navigate, click, screenshot, and more.",
    transportType: "stdio" as McpTransportType,
    status: "active" as const,
    command: "npx",
    args: ["@athreei/mcp-server"],
    version: "1.0.0",
    author: "athreei",
    repository: "https://github.com/athreei/mcp-server",
    tools: [
      { name: "navigate", description: "Navigate to a URL" },
      { name: "click", description: "Click an element on the page" },
      { name: "screenshot", description: "Take a screenshot" },
      { name: "scroll", description: "Scroll the page" },
    ],
  },
  {
    id: "2",
    name: "GitHub Integration",
    description:
      "Access GitHub repositories, issues, pull requests, and code search directly from your AI assistant.",
    transportType: "http" as McpTransportType,
    status: "active" as const,
    url: "https://mcp.github.io/api",
    version: "2.1.0",
    author: "github",
    repository: "https://github.com/github/mcp-server",
    tools: [
      { name: "search_repos", description: "Search GitHub repositories" },
      { name: "get_issues", description: "Get issues for a repository" },
      { name: "create_pr", description: "Create a pull request" },
    ],
  },
  {
    id: "3",
    name: "Slack Connector",
    description:
      "Send messages, read channels, and manage Slack workspaces through MCP.",
    transportType: "sse" as McpTransportType,
    status: "active" as const,
    url: "https://slack-mcp.example.com/sse",
    version: "1.5.0",
    author: "slack",
    repository: "https://github.com/slack/mcp-connector",
    tools: [
      { name: "send_message", description: "Send a message to a channel" },
      { name: "list_channels", description: "List available channels" },
    ],
  },
];

const transportIcons = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
};

const transportLabels = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
};

export default function RegistryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [copied, setCopied] = useState(false);

  const server = useMemo(() => {
    return mockRegistryServers.find((s) => s.id === id);
  }, [id]);

  if (!server) {
    return (
      <div>
        <PageHeader title="Server not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">
            This MCP server doesn&apos;t exist in the registry.
          </p>
          <Link
            href="/dashboard/registry"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to registry
          </Link>
        </div>
      </div>
    );
  }

  const TransportIcon = transportIcons[server.transportType];

  const configSnippet =
    server.transportType === "stdio"
      ? JSON.stringify(
          {
            mcpServers: {
              [server.name.toLowerCase().replace(/\s+/g, "-")]: {
                command: server.command,
                args: server.args,
              },
            },
          },
          null,
          2
        )
      : JSON.stringify(
          {
            mcpServers: {
              [server.name.toLowerCase().replace(/\s+/g, "-")]: {
                url: server.url,
              },
            },
          },
          null,
          2
        );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title={server.name}
        description={server.description}
        actions={
          <Link
            href="/dashboard/registry"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to registry
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">Transport</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <TransportIcon className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    {transportLabels[server.transportType]}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Version</p>
                <p className="mt-1 font-medium text-gray-900">{server.version}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Author</p>
                <p className="mt-1 font-medium text-gray-900">{server.author}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Available tools */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Available Tools</h2>
            <p className="mt-1 text-sm text-gray-500">
              These tools will be available to AI apps when connected.
            </p>
            <div className="mt-4 space-y-3">
              {server.tools?.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {tool.name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Configuration */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Configuration</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add this to your MCP configuration file.
            </p>
            <div className="relative mt-4">
              <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
                <code>{configSnippet}</code>
              </pre>
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded-md bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Resources</h2>
            <div className="mt-4 space-y-3">
              {server.repository && (
                <a
                  href={server.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Download className="h-4 w-4" />
                  View on GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
