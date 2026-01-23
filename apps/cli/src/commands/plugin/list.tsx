import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

interface Plugin {
  id: string
  slug: string
  name: string
  description: string | null
  author: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  marketplace: {
    slug: string
    name: string
  }
  latestVersion: {
    version: string
  } | null
}

export interface PluginListProps {
  json?: boolean
  search?: string
  marketplace?: string
  installed?: boolean
}

export function PluginList(props: PluginListProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const credStore = createCredentialStore()
        const orgId = await credStore.getActiveOrg()

        const params = new URLSearchParams()
        if (props.search) params.set("search", props.search)
        if (props.marketplace) params.set("marketplaceSlug", props.marketplace)
        if (orgId) params.set("organizationId", orgId)

        const queryString = params.toString()
        const path = props.installed
          ? `/api/organizations/${orgId}/plugins${queryString ? `?${queryString}` : ""}`
          : `/api/plugins${queryString ? `?${queryString}` : ""}`

        const data = await client.get<{
          data?: Plugin[]
          plugins?: Plugin[]
          installations?: Array<{
            plugin: {
              id: string
              slug: string
              name: string
              marketplace: { slug: string; name: string }
            }
            version: { version: string }
          }>
        }>(path)

        if (props.installed && data.installations) {
          setPlugins(
            data.installations.map((i) => ({
              id: i.plugin.id,
              slug: i.plugin.slug,
              name: i.plugin.name,
              description: null,
              author: null,
              isVerified: false,
              isFeatured: false,
              downloadCount: 0,
              marketplace: i.plugin.marketplace,
              latestVersion: { version: i.version.version },
            }))
          )
        } else {
          setPlugins(data.data || data.plugins || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch"))
      }
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.search, props.marketplace, props.installed])

  if (loading) return <LoadingSpinner message="Loading plugins..." />
  if (error) return <ErrorDisplay error={error} context="fetching plugins" />

  if (props.json) {
    console.log(JSON.stringify({ plugins }, null, 2))
    return null
  }

  if (plugins.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          {props.installed
            ? "No plugins installed."
            : "No plugins found. Try different search terms."}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {props.installed ? "Installed Plugins" : "Available Plugins"} (
        {plugins.length})
      </Text>
      <Box marginTop={1} flexDirection="column">
        {plugins.map((plugin) => (
          <Box key={plugin.id} marginBottom={1}>
            <Box width={30}>
              <Text bold>
                {plugin.marketplace.slug}/{plugin.slug}
              </Text>
            </Box>
            <Box width={12}>
              <Text color="gray">
                v{plugin.latestVersion?.version || "N/A"}
              </Text>
            </Box>
            <Box>
              <Text>
                {plugin.name}
                {plugin.isVerified && <Text color="blue"> ✓</Text>}
                {plugin.isFeatured && <Text color="yellow"> ★</Text>}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
