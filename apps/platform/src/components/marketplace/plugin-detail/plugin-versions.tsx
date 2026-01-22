"use client"

import { useState } from "react"
import {
  GitBranch,
  Calendar,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ValidationBadge } from "../validation-badge"
import {
  usePluginInstallation,
  useUpdatePlugin,
} from "@/hooks/use-plugin-installation"
import type { PluginVersionSummary } from "@/types/marketplace"

interface PluginVersionsProps {
  versions: PluginVersionSummary[]
  pluginId: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function PluginVersions({ versions, pluginId }: PluginVersionsProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set()
  )

  const { data: installationData, isPending: isCheckingInstallation } =
    usePluginInstallation(pluginId)
  const updateMutation = useUpdatePlugin()

  const installedVersion = installationData?.installation?.version?.version
  const installationId = installationData?.installation?.id

  const toggleVersionExpanded = (versionId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev)
      if (next.has(versionId)) {
        next.delete(versionId)
      } else {
        next.add(versionId)
      }
      return next
    })
  }

  const handleInstallVersion = async (version: string) => {
    if (!installationId) return
    await updateMutation.mutateAsync({
      installationId,
      version,
    })
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-center text-gray-500">No versions available.</p>
      </div>
    )
  }

  const sortedVersions = [...versions].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Version History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {versions.length} {versions.length === 1 ? "version" : "versions"}{" "}
            available
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedVersions.map((version) => {
            const isInstalled = installedVersion === version.version
            const isExpanded = expandedVersions.has(version.id)
            const isUpdating =
              updateMutation.isPending &&
              updateMutation.variables?.version === version.version

            return (
              <div key={version.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          v{version.version}
                        </span>
                      </div>

                      {version.isLatest && (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700"
                        >
                          Latest
                        </Badge>
                      )}

                      {isInstalled && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Installed
                        </Badge>
                      )}

                      {version.validation && (
                        <ValidationBadge
                          status={version.validation.status}
                          errors={version.validation.errors}
                          warnings={version.validation.warnings}
                        />
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Published {formatDate(version.publishedAt)}</span>
                    </div>

                    {version.changelog && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleVersionExpanded(version.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide changelog
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View changelog
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 rounded-lg bg-gray-50 p-4">
                            <p className="whitespace-pre-wrap text-sm text-gray-600">
                              {version.changelog}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isCheckingInstallation ? (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : isInstalled ? (
                      <Button variant="outline" size="sm" disabled>
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        Installed
                      </Button>
                    ) : installationId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInstallVersion(version.version)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {isUpdating ? "Installing..." : "Install"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
