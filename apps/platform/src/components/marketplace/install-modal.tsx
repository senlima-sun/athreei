"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
      if (mountedRef.current) {
        onSuccess?.()
        handleClose()
      }
    } catch {}
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

  const handleOpenChange = (open: boolean) => {
    if (!open && !installMutation.isPending) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!installMutation.isPending}>
        <DialogHeader className="flex-row items-center gap-3 border-b border-gray-200 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Download className="h-5 w-5 text-gray-600" />
          </div>
          <div className="min-w-0">
            <DialogTitle>Install {pluginName}</DialogTitle>
            {version && (
              <DialogDescription className="mt-0.5">
                Version {version}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5">
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

        <DialogFooter className="gap-3 border-t border-gray-200 pt-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
