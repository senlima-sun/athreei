"use client"

import { useState } from "react"
import {
  Key,
  Settings,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePluginInstallation } from "@/hooks/use-plugin-installation"
import type { EnvVarDefinition, PluginManifest } from "@/types/marketplace"

interface PluginConfigurationProps {
  pluginId: string
  manifest?: PluginManifest
  envVars?: EnvVarDefinition[]
}

export function PluginConfiguration({
  pluginId,
  manifest,
  envVars = [],
}: PluginConfigurationProps) {
  const { data: installationData, isPending: isLoading } =
    usePluginInstallation(pluginId)

  const installation = installationData?.installation
  const isInstalled = !!installation
  const installedConfig = installation?.config as Record<string, unknown> | null

  const requiredEnvVars = envVars.filter((v) => v.required)
  const optionalEnvVars = envVars.filter((v) => !v.required)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      </div>
    )
  }

  if (envVars.length === 0 && !manifest) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
        </div>
        <p className="mt-4 text-gray-500">
          This plugin does not require any configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {envVars.length > 0 && (
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

              <div className="mt-4 divide-y divide-gray-100">
                {requiredEnvVars.map((envVar) => (
                  <EnvVarItem
                    key={envVar.name}
                    envVar={envVar}
                    isInstalled={isInstalled}
                    installedValue={
                      installedConfig?.[envVar.name] as string | undefined
                    }
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

              <div className="mt-4 divide-y divide-gray-100">
                {optionalEnvVars.map((envVar) => (
                  <EnvVarItem
                    key={envVar.name}
                    envVar={envVar}
                    isInstalled={isInstalled}
                    installedValue={
                      installedConfig?.[envVar.name] as string | undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isInstalled && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Installation Status
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            This plugin is installed and configured for your organization.
          </p>
          <div className="mt-4 rounded-lg bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Configuration values are securely stored and encrypted
              </span>
            </div>
          </div>
        </div>
      )}

      {!isInstalled && envVars.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-medium text-amber-800">
                Install to configure
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Install this plugin to configure the required environment
                variables and settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface EnvVarItemProps {
  envVar: EnvVarDefinition
  isInstalled: boolean
  installedValue?: string
}

function EnvVarItem({ envVar, isInstalled, installedValue }: EnvVarItemProps) {
  const [showValue, setShowValue] = useState(false)

  const hasValue = !!installedValue

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm font-medium text-gray-800">
              {envVar.name}
            </code>
            {envVar.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            {isInstalled && hasValue && (
              <Badge
                variant="secondary"
                className="bg-green-50 text-green-700 text-xs"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Configured
              </Badge>
            )}
          </div>
          {envVar.description && (
            <p className="mt-1 text-sm text-gray-600">{envVar.description}</p>
          )}
        </div>

        {isInstalled && hasValue && (
          <div className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {isInstalled && hasValue && showValue && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <code className="font-mono text-sm text-gray-700">
            {maskValue(installedValue)}
          </code>
        </div>
      )}
    </div>
  )
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return "*".repeat(value.length)
  }
  return value.slice(0, 2) + "*".repeat(Math.max(value.length - 2, 4))
}
