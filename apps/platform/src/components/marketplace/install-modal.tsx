"use client"

import { useState, useCallback, useMemo } from "react"
import { X, Loader2, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScopeSelector } from "./scope-selector"
import { EnvVarInput } from "./env-var-input"
import { useInstallPlugin } from "@/hooks/use-plugin-installation"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type {
  PluginInstallationScope,
  EnvVarDefinition,
} from "@/types/marketplace"

interface InstallModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  pluginName: string
  pluginSlug: string
  marketplaceSlug: string
  version?: string
  envVars?: EnvVarDefinition[]
  canInstallForOrg?: boolean
}

export function InstallModal({
  isOpen,
  onClose,
  onSuccess,
  pluginName,
  pluginSlug,
  marketplaceSlug,
  version,
  envVars = [],
  canInstallForOrg = true,
}: InstallModalProps) {
  const { data: activeOrg } = useActiveOrganizationSafe()
  const installMutation = useInstallPlugin()

  const [scope, setScope] = useState<PluginInstallationScope>(
    canInstallForOrg ? "organization" : "user"
  )
  const [envValues, setEnvValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    envVars.forEach((v) => {
      initial[v.name] = ""
    })
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const requiredEnvVars = useMemo(
    () => envVars.filter((v) => v.required),
    [envVars]
  )

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    requiredEnvVars.forEach((v) => {
      if (!envValues[v.name]?.trim()) {
        newErrors[v.name] = "This field is required"
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [requiredEnvVars, envValues])

  const handleEnvChange = useCallback((name: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const handleInstall = async () => {
    if (!validateForm()) return

    try {
      await installMutation.mutateAsync({
        marketplaceSlug,
        pluginSlug,
        version,
        scope,
        envValues:
          Object.keys(envValues).length > 0
            ? Object.fromEntries(
                Object.entries(envValues).filter(([, v]) => v.trim())
              )
            : undefined,
      })
      onSuccess?.()
      handleClose()
    } catch {
      // Error is handled by mutation state
    }
  }

  const handleClose = () => {
    if (!installMutation.isPending) {
      setEnvValues(() => {
        const initial: Record<string, string> = {}
        envVars.forEach((v) => {
          initial[v.name] = ""
        })
        return initial
      })
      setErrors({})
      setScope(canInstallForOrg ? "organization" : "user")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Download className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Install {pluginName}
              </h2>
              {version && (
                <p className="text-xs text-gray-500">Version {version}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={installMutation.isPending}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-4">
          <p className="text-sm text-gray-600">
            Choose where to install this plugin. Organization installs are
            available to all members, while personal installs are only available
            to you.
          </p>

          <ScopeSelector
            value={scope}
            onChange={setScope}
            orgName={activeOrg?.name}
            canInstallForOrg={canInstallForOrg}
            disabled={installMutation.isPending}
          />

          {envVars.length > 0 && (
            <div className="space-y-4">
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Configuration
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  This plugin requires the following environment variables
                </p>
              </div>
              {envVars.map((envVar) => (
                <EnvVarInput
                  key={envVar.name}
                  name={envVar.name}
                  description={envVar.description}
                  required={envVar.required}
                  value={envValues[envVar.name] || ""}
                  onChange={(value) => handleEnvChange(envVar.name, value)}
                  error={errors[envVar.name]}
                  disabled={installMutation.isPending}
                />
              ))}
            </div>
          )}

          {installMutation.isError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div className="text-sm text-red-700">
                {installMutation.error?.message ||
                  "Failed to install plugin. Please try again."}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={installMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInstall}
            disabled={installMutation.isPending}
          >
            {installMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Install
          </Button>
        </div>
      </div>
    </div>
  )
}
