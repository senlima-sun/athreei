import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

export interface PluginUninstallProps {
  installationId: string
  json?: boolean
}

export function PluginUninstall(props: PluginUninstallProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function uninstall() {
      try {
        const client = getApiClient()
        const credStore = createCredentialStore()
        const orgId = await credStore.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No active organization. Run 'athreei org switch' first."
          )
        }

        await client.post<{ message: string }>(
          `/api/organizations/${orgId}/plugins/${props.installationId}/uninstall`
        )

        setSuccess(true)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Uninstallation failed")
        )
      }
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    uninstall()
  }, [exit, props.installationId])

  if (loading) return <LoadingSpinner message="Uninstalling plugin..." />
  if (error) return <ErrorDisplay error={error} context="uninstalling plugin" />

  if (props.json) {
    console.log(
      JSON.stringify({ success, installationId: props.installationId }, null, 2)
    )
    return null
  }

  return (
    <Box padding={1}>
      <Text color="green">✓ Plugin uninstalled successfully!</Text>
    </Box>
  )
}
