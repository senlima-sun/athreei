import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

export interface PluginInstallProps {
  pluginId: string
  version?: string
  scope?: "organization" | "user"
  json?: boolean
}

interface InstallationResult {
  id: string
  pluginId: string
  status: string
  plugin: {
    slug: string
    name: string
    marketplace: { slug: string }
  }
  version: {
    version: string
  }
}

export function PluginInstall(props: PluginInstallProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<InstallationResult | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function install() {
      try {
        const client = getApiClient()
        const credStore = createCredentialStore()
        const orgId = credStore.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No active organization. Run 'athreei org switch' first."
          )
        }

        const [marketplaceSlug, pluginSlug] = props.pluginId.includes("/")
          ? props.pluginId.split("/")
          : ["official", props.pluginId]

        const body = {
          marketplaceSlug,
          pluginSlug,
          version: props.version,
          scope: props.scope || "organization",
        }

        const data = await client.post<{ installation: InstallationResult }>(
          `/api/organizations/${orgId}/plugins/install`,
          body
        )

        setResult(data.installation)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Installation failed"))
      }
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    install()
  }, [exit, props.pluginId, props.version, props.scope])

  if (loading) return <LoadingSpinner message="Installing plugin..." />
  if (error) return <ErrorDisplay error={error} context="installing plugin" />

  if (props.json) {
    console.log(JSON.stringify({ installation: result }, null, 2))
    return null
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green">✓ Plugin installed successfully!</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold>Plugin:</Text> {result?.plugin.name}
        </Text>
        <Text>
          <Text bold>Version:</Text> {result?.version.version}
        </Text>
        <Text>
          <Text bold>ID:</Text> {result?.id}
        </Text>
      </Box>
    </Box>
  )
}
