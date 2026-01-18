import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { getStatusColor } from "../../lib/format"
import type { Endpoint } from "../../types/api"

interface EndpointListResponse {
  data: Endpoint[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export interface EndpointListProps {
  json?: boolean
}

export function EndpointList(props: EndpointListProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        setError(
          new Error("No organization selected. Run: athreei org switch <name>")
        )
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "50",
        })

        const client = getApiClient()
        const data = await client.get<EndpointListResponse>(
          `/api/endpoints?${params.toString()}`
        )
        setEndpoints(data.data)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch endpoints")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return <LoadingSpinner message="Loading endpoints..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching endpoints" />
  }

  if (props.json) {
    console.log(JSON.stringify({ endpoints }, null, 2))
    return null
  }

  if (endpoints.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No endpoints found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Endpoints ({endpoints.length})
        </Text>
      </Box>
      {endpoints.map((endpoint) => (
        <Box key={endpoint.id} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold>{endpoint.name}</Text>
            <Text dimColor> ({endpoint.slug})</Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>Status: </Text>
            <Text color={getStatusColor(endpoint.status)}>
              {endpoint.status}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>MCP Servers: </Text>
            <Text>{endpoint.mcpServers?.length ?? 0}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
