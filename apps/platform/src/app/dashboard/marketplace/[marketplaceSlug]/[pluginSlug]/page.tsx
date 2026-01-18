"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Puzzle, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/dashboard"
import {
  PluginDetailHeader,
  PluginOverview,
  PluginComponents,
  PluginVersions,
  PluginConfiguration,
} from "@/components/marketplace/plugin-detail"
import {
  usePlugin,
  usePluginVersions,
  usePluginVersion,
} from "@/hooks/use-plugins"
import type {
  EnvVarDefinition,
  McpServerComponentConfig,
} from "@/types/marketplace"

type TabValue = "overview" | "components" | "versions" | "configuration"

export default function PluginDetailPage() {
  const params = useParams()
  const router = useRouter()
  const marketplaceSlug = params.marketplaceSlug as string
  const pluginSlug = params.pluginSlug as string

  const [activeTab, setActiveTab] = useState<TabValue>("overview")

  const {
    data: pluginData,
    isPending: isPluginLoading,
    isError: isPluginError,
    error: pluginError,
  } = usePlugin(marketplaceSlug, pluginSlug)

  const { data: versionsData, isPending: isVersionsLoading } =
    usePluginVersions(marketplaceSlug, pluginSlug)

  const plugin = pluginData?.plugin
  const versions = versionsData?.versions ?? []
  const latestVersion = versions.find((v) => v.isLatest)

  const { data: latestVersionData } = usePluginVersion(
    marketplaceSlug,
    pluginSlug,
    latestVersion?.version
  )

  const latestVersionDetails = latestVersionData?.version
  const components = latestVersionDetails?.components ?? []

  const envVars = useMemo(() => {
    if (!components) return []

    const mcpServerComponents = components.filter(
      (c) => c.type === "mcp_server"
    )

    const allEnvVars: EnvVarDefinition[] = []
    const seenNames = new Set<string>()

    mcpServerComponents.forEach((component) => {
      const config = (
        component as unknown as { config?: McpServerComponentConfig }
      ).config
      if (config?.envVars) {
        config.envVars.forEach((envVar) => {
          if (!seenNames.has(envVar.name)) {
            seenNames.add(envVar.name)
            allEnvVars.push(envVar)
          }
        })
      }
    })

    return allEnvVars
  }, [components])

  const handleConfigure = () => {
    setActiveTab("configuration")
  }

  const backHref = marketplaceSlug
    ? `/dashboard/marketplace?marketplace=${marketplaceSlug}`
    : "/dashboard/marketplace"

  if (isPluginLoading) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        </div>
        <LoadingState message="Loading plugin details..." />
      </div>
    )
  }

  if (isPluginError || !plugin) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          {isPluginError ? (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                Error loading plugin
              </h2>
              <p className="mt-2 text-gray-500">
                {(pluginError as Error)?.message ||
                  "An error occurred while loading the plugin."}
              </p>
              <Button
                variant="outline"
                onClick={() => router.refresh()}
                className="mt-4"
              >
                Try again
              </Button>
            </>
          ) : (
            <>
              <Puzzle className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                Plugin not found
              </h2>
              <p className="mt-2 text-gray-500">
                This plugin doesn&apos;t exist or you don&apos;t have access to
                it.
              </p>
              <Link
                href="/dashboard/marketplace"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to marketplace
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>
      </div>

      <PluginDetailHeader
        plugin={plugin}
        latestVersion={latestVersion}
        envVars={envVars}
        onConfigure={handleConfigure}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">
            Components
            {components.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {components.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">
            Versions
            {versions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {versions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <PluginOverview
            plugin={plugin}
            readme={latestVersionDetails?.manifest?.description}
          />
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          {isVersionsLoading ? (
            <LoadingState message="Loading components..." />
          ) : (
            <PluginComponents components={components} />
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          {isVersionsLoading ? (
            <LoadingState message="Loading versions..." />
          ) : (
            <PluginVersions versions={versions} pluginId={plugin.id} />
          )}
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <PluginConfiguration
            pluginId={plugin.id}
            manifest={latestVersionDetails?.manifest}
            envVars={envVars}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
