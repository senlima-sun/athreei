"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { OAuthSetupGuide } from "@/components/mcp"
import { useActiveOrganization } from "@/lib/auth-client"
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/mcp-oauth-detection"
import {
  Server,
  ArrowLeft,
  Download,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  docsUrl: string
  envVars: Array<{
    name: string
    description: string
    required: boolean
  }>
  categories: string[]
  verified: boolean
}

interface PageParams {
  slug: string
}

export default function RegistryDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()

  const [server, setServer] = useState<RegistryServer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [envVarValues, setEnvVarValues] = useState<Record<string, string>>({})
  const [oauthToken, setOauthToken] = useState("")

  // Detect OAuth provider based on slug
  const oauthProvider: OAuthProvider | null =
    OAUTH_PROVIDERS[slug.toLowerCase()] || null

  // Load server data from API
  const loadServer = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/registry/${slug}`)

      if (!response.ok) {
        if (response.status === 404) {
          setServer(null)
          return
        }
        throw new Error("Failed to fetch server details")
      }

      const data = await response.json()
      setServer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load server")
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadServer()
  }, [loadServer])

  const handleInstall = async () => {
    if (!activeOrg || !server) return

    setIsInstalling(true)
    setError(null)

    try {
      // Collect environment variables from OAuth token and custom env vars
      const env: Record<string, string> = {}

      // Add OAuth token if provided
      if (oauthProvider && oauthToken) {
        env[oauthProvider.envVarNames[0]] = oauthToken
      }

      // Add custom env vars
      for (const [key, value] of Object.entries(envVarValues)) {
        if (key.trim() && value) {
          env[key.trim()] = value
        }
      }

      const body = {
        name: server.name,
        description: server.description,
        transport: server.transport,
        command: server.command,
        args: server.args?.join(" "),
        url: server.url,
        ...(Object.keys(env).length > 0 ? { env } : {}),
      }

      const response = await fetch(
        `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Failed to install MCP server")
      }

      const mcpServer = await response.json()
      router.push(`/dashboard/mcp-servers/${mcpServer.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to install server")
    } finally {
      setIsInstalling(false)
    }
  }

  const handleEnvVarChange = (name: string, value: string) => {
    setEnvVarValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Installation is always allowed - env vars can be configured separately
  // TODO: Re-enable validation when env var storage is implemented
  const canInstall = () => {
    return activeOrg !== null && server !== null
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!server) {
    router.push("/dashboard/registry")
    return null
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/registry"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Registry
      </Link>

      {/* Server header */}
      <div className="mb-8 flex items-start gap-6">
        {/* Icon or initial placeholder */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          {server.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={server.iconUrl}
              alt={server.name}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <Server className="h-8 w-8 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
            {server.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">by {server.publisher}</p>
          <p className="mt-3 text-gray-600">{server.description}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* OAuth Setup Guide or Env Vars section */}
        {oauthProvider ? (
          <OAuthSetupGuide
            provider={oauthProvider}
            envVarName={oauthProvider.envVarNames[0]}
            currentValue={oauthToken}
            onTokenChange={setOauthToken}
          />
        ) : (
          server.envVars.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">
                Environment Variables
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure the required environment variables for this MCP
                server.
              </p>

              <div className="mt-4 space-y-4">
                {server.envVars.map((envVar) => (
                  <div key={envVar.name}>
                    <label
                      htmlFor={`env-${envVar.name}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      {envVar.name}
                      {envVar.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {envVar.description}
                    </p>
                    <input
                      type="password"
                      id={`env-${envVar.name}`}
                      value={envVarValues[envVar.name] || ""}
                      onChange={(e) =>
                        handleEnvVarChange(envVar.name, e.target.value)
                      }
                      placeholder={`Enter ${envVar.name}`}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Install button */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {!activeOrg ? (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Please select an organization to install this MCP server.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Install to {activeOrg.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add this MCP server to your organization.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling || isOrgPending || !canInstall()}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isInstalling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Install
              </button>
            </div>
          )}
        </div>

        {/* Documentation link */}
        <div className="text-center">
          <a
            href={server.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="h-4 w-4" />
            View documentation
          </a>
        </div>
      </div>
    </div>
  )
}
