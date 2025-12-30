"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Server, Plus, X } from "lucide-react";
import { McpTypeSelector, McpTransportType } from "./mcp-type-selector";
import { McpServer, McpServerStatus } from "./mcp-server-card";

interface McpServerFormProps {
  server?: McpServer;
  onSubmit: (data: McpServerFormData) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}

export interface McpServerFormData {
  name: string;
  description: string;
  transportType: McpTransportType;
  status: McpServerStatus;
  command?: string;
  args?: string[];
  url?: string;
}

export function McpServerForm({
  server,
  onSubmit,
  cancelHref,
  submitLabel = "Create MCP Server",
}: McpServerFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(server?.name || "");
  const [description, setDescription] = useState(server?.description || "");
  const [transportType, setTransportType] = useState<McpTransportType>(
    server?.transportType || "stdio"
  );
  const [status, setStatus] = useState<McpServerStatus>(server?.status || "active");

  // STDIO config
  const [command, setCommand] = useState(server?.command || "");
  const [args, setArgs] = useState<string[]>(server?.args || []);
  const [newArg, setNewArg] = useState("");

  // SSE/HTTP config
  const [url, setUrl] = useState(server?.url || "");

  // Validation
  const isStdio = transportType === "stdio";
  const isValid = Boolean(
    name.trim() &&
      (isStdio ? command.trim() : url.trim())
  );

  const handleAddArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()]);
      setNewArg("");
    }
  };

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddArg();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData: McpServerFormData = {
        name: name.trim(),
        description: description.trim(),
        transportType,
        status,
        ...(isStdio
          ? { command: command.trim(), args }
          : { url: url.trim() }),
      };

      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Server icon */}
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
          <Server className="h-10 w-10 text-gray-400" />
        </div>
      </div>

      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My MCP Server"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
            <span className="ml-1 text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of what this server does..."
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Transport type */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Transport Type</h3>
        <McpTypeSelector
          value={transportType}
          onChange={setTransportType}
          disabled={isSubmitting}
        />
      </div>

      {/* Connection config */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Connection Configuration</h3>

        {isStdio ? (
          <>
            <div>
              <label
                htmlFor="command"
                className="block text-sm font-medium text-gray-700"
              >
                Command
              </label>
              <input
                type="text"
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx @modelcontextprotocol/server-example"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                The command to start the MCP server process
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Arguments
                <span className="ml-1 text-gray-400">(optional)</span>
              </label>

              {/* Existing args */}
              {args.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {args.map((arg, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-mono text-gray-700"
                    >
                      {arg}
                      <button
                        type="button"
                        onClick={() => handleRemoveArg(index)}
                        className="ml-1 rounded-sm p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add new arg */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newArg}
                  onChange={(e) => setNewArg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="--flag value"
                  className="block flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  type="button"
                  onClick={handleAddArg}
                  disabled={!newArg.trim()}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700"
            >
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                transportType === "sse"
                  ? "https://api.example.com/mcp/sse"
                  : "https://api.example.com/mcp"
              }
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {transportType === "sse"
                ? "The SSE endpoint URL for the MCP server"
                : "The HTTP endpoint URL for the MCP server"}
            </p>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Status</h3>
        <div className="flex gap-3">
          {(["active", "inactive"] as McpServerStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                status === s
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Link
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
