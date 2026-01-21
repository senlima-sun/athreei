"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Settings,
  Key,
  Loader2,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
} from "lucide-react"
import { PageHeader, LoadingState, ErrorState } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useInstallationById,
  useInstallationEnv,
  useUpdateInstallation,
} from "@/hooks/use-plugin-installation"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type { EnvVarDefinition } from "@/types/marketplace"

export default function PluginConfigurePage() {
  const params = useParams()
  const installationId = params.id as string
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  const {
    data: installationData,
    isLoading: isLoadingInstallation,
    isError: isInstallationError,
    error: installationError,
    refetch: refetchInstallation,
  } = useInstallationById(installationId)

  const {
    data: envData,
    isLoading: isLoadingEnv,
    refetch: refetchEnv,
  } = useInstallationEnv(installationId)

  const updateMutation = useUpdateInstallation()

  const [envValues, setEnvValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const installation = installationData?.installation
  const currentEnv = envData?.envValues ?? {}

  const mcpComponents =
    installation?.components?.filter((c) => c.type === "mcp_server") ?? []
  const envVarDefinitions: EnvVarDefinition[] = mcpComponents.flatMap((c) => {
    const config = c.config as { envVars?: EnvVarDefinition[] } | null
    return config?.envVars ?? []
  })

  const handleEnvChange = useCallback(
    (name: string, value: string) => {
      setEnvValues((prev) => ({ ...prev, [name]: value }))
      setHasChanges(true)
      setSaveSuccess(false)
    },
    []
  )

  const toggleShowValue = useCallback((name: string) => {
    setShowValues((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!installation) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const mergedEnv = { ...currentEnv, ...envValues }
      await updateMutation.mutateAsync({
        installationId: installation.id,
        updates: { envValues: mergedEnv },
      })
      setHasChanges(false)
      setSaveSuccess(true)
      refetchEnv()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsSaving(false)
    }
  }, [installation, currentEnv, envValues, updateMutation, refetchEnv])

  const isLoading = isOrgPending || isLoadingInstallation || isLoadingEnv

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Configure Plugin" />
        <LoadingState message="Loading plugin configuration..." />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader title="Configure Plugin" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to configure this plugin.
          </p>
        </div>
      </div>
    )
  }

  if (isInstallationError || !installation) {
    return (
      <div>
        <PageHeader title="Plugin not found" />
        <div className="space-y-4">
          <ErrorState
            message={
              installationError instanceof Error
                ? installationError.message
                : "This plugin installation doesn't exist or you don't have access to it."
            }
            onRetry={() => refetchInstallation()}
          />
          <div className="text-center">
            <Link
              href="/dashboard/plugins"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to plugins
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const requiredEnvVars = envVarDefinitions.filter((v) => v.required)
  const optionalEnvVars = envVarDefinitions.filter((v) => !v.required)
  const hasEnvVars = envVarDefinitions.length > 0

  return (
    <div>
      <PageHeader
        title={`Configure ${installation.plugin.name}`}
        description={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">v{installation.version.version}</Badge>
            <span className="text-sm text-gray-500">
              from {installation.plugin.marketplace.name}
            </span>
          </div>
        }
        actions={
          <Link
            href="/dashboard/plugins"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {hasEnvVars ? (
          <>
            {requiredEnvVars.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Required Environment Variables
                  </h2>
                  <Badge variant="destructive" className="ml-2">
                    {requiredEnvVars.length} required
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  These variables must be configured for the plugin to work
                  properly.
                </p>

                <div className="mt-4 space-y-4">
                  {requiredEnvVars.map((envVar) => (
                    <EnvVarInput
                      key={envVar.name}
                      envVar={envVar}
                      value={envValues[envVar.name] ?? currentEnv[envVar.name] ?? ""}
                      showValue={showValues.has(envVar.name)}
                      onChange={(value) => handleEnvChange(envVar.name, value)}
                      onToggleShow={() => toggleShowValue(envVar.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {optionalEnvVars.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Optional Settings
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {optionalEnvVars.length} optional
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  These variables are optional but can enhance the plugin
                  functionality.
                </p>

                <div className="mt-4 space-y-4">
                  {optionalEnvVars.map((envVar) => (
                    <EnvVarInput
                      key={envVar.name}
                      envVar={envVar}
                      value={envValues[envVar.name] ?? currentEnv[envVar.name] ?? ""}
                      showValue={showValues.has(envVar.name)}
                      onChange={(value) => handleEnvChange(envVar.name, value)}
                      onToggleShow={() => toggleShowValue(envVar.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Configuration saved
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Configuration
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Configuration
              </h2>
            </div>
            <p className="mt-4 text-gray-500">
              This plugin does not require any configuration.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Installation Details
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <Badge
                  variant={
                    installation.status === "active" ? "default" : "secondary"
                  }
                >
                  {installation.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Scope</dt>
              <dd className="mt-1 text-gray-900">{installation.scope}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Installed</dt>
              <dd className="mt-1 text-gray-900">
                {new Date(installation.installedAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-gray-900">
                {new Date(installation.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

interface EnvVarInputProps {
  envVar: EnvVarDefinition
  value: string
  showValue: boolean
  onChange: (value: string) => void
  onToggleShow: () => void
}

function EnvVarInput({
  envVar,
  value,
  showValue,
  onChange,
  onToggleShow,
}: EnvVarInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={envVar.name} className="flex items-center gap-2">
          <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm">
            {envVar.name}
          </code>
          {envVar.required && (
            <span className="text-xs text-red-500">*</span>
          )}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleShow}
        >
          {showValue ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
      {envVar.description && (
        <p className="text-sm text-gray-500">{envVar.description}</p>
      )}
      <Input
        id={envVar.name}
        type={showValue ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={envVar.required ? "Required" : "Optional"}
      />
    </div>
  )
}
