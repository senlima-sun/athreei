"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Loader2,
  Server,
  Plus,
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { McpTypeSelector, McpTransportType } from "./mcp-type-selector"
import { McpServer, McpServerStatus } from "./mcp-server-card"
import {
  detectOAuthProviderByName,
  type OAuthProvider,
} from "@/lib/_deprecated/mcp-oauth-detection"
import { API_URL } from "@/constants"

interface McpServerFormProps {
  server?: McpServer & { envKeys?: string[] }
  onSubmit: (data: McpServerFormData) => Promise<void>
  cancelHref: string
  submitLabel?: string
}

export interface McpServerFormData {
  name: string
  description: string
  transportType: McpTransportType
  status: McpServerStatus
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
}

interface EnvVarRow {
  key: string
  value: string
}

/** Verification state */
interface VerificationState {
  status: "idle" | "verifying" | "success" | "error"
  toolCount?: number
  tools?: string[]
  error?: string
}

export function McpServerForm({
  server,
  onSubmit,
  cancelHref,
  submitLabel = "Create MCP Server",
}: McpServerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(server?.name || "")
  const [description, setDescription] = useState(server?.description || "")
  const [transportType, setTransportType] = useState<McpTransportType>(
    server?.transportType || "stdio"
  )
  const [status, setStatus] = useState<McpServerStatus>(
    server?.status || "active"
  )

  // STDIO config
  const [command, setCommand] = useState(server?.command || "")
  const [args, setArgs] = useState<string[]>(server?.args || [])
  const [newArg, setNewArg] = useState("")

  // SSE/HTTP config
  const [url, setUrl] = useState(server?.url || "")

  // Auth token for SSE/HTTP servers
  const [authToken, setAuthToken] = useState("")
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [verification, setVerification] = useState<VerificationState>({
    status: "idle",
  })

  // Environment variables
  // When editing, show existing keys with empty values (user can fill in new values)
  const [envVars, setEnvVars] = useState<EnvVarRow[]>(() => {
    if (server?.envKeys?.length) {
      return server.envKeys.map((key) => ({ key, value: "" }))
    }
    return []
  })

  // OAuth detection state (for showing provider-specific token instructions)
  const [detectedProvider, setDetectedProvider] =
    useState<OAuthProvider | null>(null)

  // Detect OAuth provider when name changes
  useEffect(() => {
    if (name.trim()) {
      const provider = detectOAuthProviderByName(name)
      setDetectedProvider(provider)
    } else {
      setDetectedProvider(null)
    }
  }, [name])

  // Validation
  const isStdio = transportType === "stdio"
  const isValid = Boolean(
    name.trim() && (isStdio ? command.trim() : url.trim())
  )

  const handleAddArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()])
      setNewArg("")
    }
  }

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddArg()
    }
  }

  // Env var handlers
  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }])
  }

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  const handleEnvVarChange = (
    index: number,
    field: "key" | "value",
    newValue: string
  ) => {
    setEnvVars(
      envVars.map((row, i) =>
        i === index ? { ...row, [field]: newValue } : row
      )
    )
  }

  // Convert env vars to API format
  const getEnvForApi = (): Record<string, string> | undefined => {
    // Start with any env vars from the form rows
    const env = envVars.reduce(
      (acc, { key, value }) => {
        const trimmedKey = key.trim()
        if (trimmedKey && value) {
          acc[trimmedKey] = value
        }
        return acc
      },
      {} as Record<string, string>
    )

    // Add auth token as AUTH_TOKEN env var if provided (for SSE/HTTP transports)
    if (!isStdio && authToken.trim()) {
      env["AUTH_TOKEN"] = authToken.trim()
    }

    return Object.keys(env).length > 0 ? env : undefined
  }

  // Reset verification when URL or auth token changes
  useEffect(() => {
    if (verification.status !== "idle") {
      setVerification({ status: "idle" })
    }
  }, [url, authToken])

  // Verify connection to MCP server
  const handleVerify = async () => {
    if (!url.trim() || !authToken.trim()) {
      return
    }

    setVerification({ status: "verifying" })
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/mcp-servers/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          serverUrl: url.trim(),
          authToken: authToken.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setVerification({
          status: "error",
          error: data.error || "Failed to verify connection",
        })
        return
      }

      if (data.success) {
        setVerification({
          status: "success",
          toolCount: data.toolCount,
          tools: data.tools,
        })
      } else {
        setVerification({
          status: "error",
          error: data.error || "Connection failed",
        })
      }
    } catch (err) {
      setVerification({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during verification",
      })
    }
  }

  // Determine if form can be submitted
  // For SSE/HTTP: require successful verification if auth token is provided
  const canSubmit = isStdio
    ? isValid
    : isValid && (!authToken.trim() || verification.status === "success")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const env = getEnvForApi()
      const formData: McpServerFormData = {
        name: name.trim(),
        description: description.trim(),
        transportType,
        status,
        ...(isStdio ? { command: command.trim(), args } : { url: url.trim() }),
        ...(env ? { env } : {}),
      }

      await onSubmit(formData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <h3 className="text-sm font-medium text-gray-900">
          Connection Configuration
        </h3>

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
          <>
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700"
              >
                Server URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  transportType === "sse"
                    ? "https://mcp.sentry.io/sse"
                    : "https://mcp.sentry.io"
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

            {/* Auth Token */}
            <div>
              <label
                htmlFor="authToken"
                className="block text-sm font-medium text-gray-700"
              >
                Auth Token
                <span className="ml-1 text-gray-400">(recommended)</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showAuthToken ? "text" : "password"}
                  id="authToken"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="sntrys_xxxxx or your API token"
                  autoComplete="new-password"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthToken(!showAuthToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                >
                  {showAuthToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Token Instructions */}
            {detectedProvider ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-medium text-blue-900">
                  How to get your {detectedProvider.displayName} token:
                </h4>
                <ol className="mt-2 space-y-1">
                  {detectedProvider.instructions.map(
                    (instruction: string, index: number) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm text-blue-800"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-800">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    )
                  )}
                </ol>
                {detectedProvider.authUrl && (
                  <a
                    href={detectedProvider.authUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    Get token from {detectedProvider.displayName}
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-700">
                  How to get your token:
                </h4>
                <ol className="mt-2 space-y-1 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                      1
                    </span>
                    <span>Go to your provider&apos;s settings page</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                      2
                    </span>
                    <span>Create a new API token or access token</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                      3
                    </span>
                    <span>Copy and paste it here</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Verify Button */}
            {url.trim() && authToken.trim() && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={
                    verification.status === "verifying" ||
                    !url.trim() ||
                    !authToken.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verification.status === "verifying" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying connection...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Verify Connection
                    </>
                  )}
                </button>

                {/* Verification Result */}
                {verification.status === "success" && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>
                      Connected successfully - Found {verification.toolCount}{" "}
                      tool
                      {verification.toolCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {verification.status === "error" && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <span>{verification.error}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Environment Variables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              Environment Variables
            </h3>
            <span className="text-sm text-gray-400">(optional)</span>
          </div>
          <button
            type="button"
            onClick={handleAddEnvVar}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
            Add Variable
          </button>
        </div>

        {server?.envKeys &&
          server.envKeys.length > 0 &&
          envVars.length === 0 && (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-medium">Configured variables:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {server.envKeys.map((key) => (
                  <span
                    key={key}
                    className="rounded bg-gray-200 px-2 py-0.5 font-mono text-xs"
                  >
                    {key}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Values are stored securely. Click &quot;Add Variable&quot; to
                add or update variables.
              </p>
            </div>
          )}

        {envVars.length > 0 && (
          <div className="space-y-3">
            {envVars.map((envVar, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={envVar.key}
                    onChange={(e) =>
                      handleEnvVarChange(index, "key", e.target.value)
                    }
                    placeholder="VARIABLE_NAME"
                    autoComplete="off"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="password"
                    value={envVar.value}
                    onChange={(e) =>
                      handleEnvVarChange(index, "value", e.target.value)
                    }
                    placeholder="Value"
                    autoComplete="new-password"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEnvVar(index)}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Environment variables are stored securely and encrypted at rest.
              Values are never displayed after saving.
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
          disabled={isSubmitting || !canSubmit}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {!isStdio && authToken.trim() && verification.status !== "success"
            ? "Verify & Save"
            : submitLabel}
        </button>
      </div>
    </form>
  )
}
