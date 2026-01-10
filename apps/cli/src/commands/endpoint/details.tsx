import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { formatDateTime, getStatusColor } from "../../lib/format.js"
import type { Endpoint } from "../../types/api.js"

interface EndpointResponse {
  data: Endpoint
}

export interface EndpointDetailsProps {
  id: string
}

export function EndpointDetails(props: EndpointDetailsProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const data = await client.get<EndpointResponse>(
          `/api/endpoints/${props.id}`
        )
        setEndpoint(data.data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch endpoint details")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.id])

  if (loading) {
    return <LoadingSpinner message="Loading endpoint details..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching endpoint details" />
  }

  if (!endpoint) {
    return (
      <Box padding={1}>
        <Text color="red">Endpoint not found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Endpoint Details
        </Text>
      </Box>

      <Box>
        <Text bold>Name: </Text>
        <Text>{endpoint.name}</Text>
      </Box>
      <Box>
        <Text bold>Slug: </Text>
        <Text>{endpoint.slug}</Text>
      </Box>
      <Box>
        <Text bold>ID: </Text>
        <Text dimColor>{endpoint.id}</Text>
      </Box>
      <Box>
        <Text bold>Status: </Text>
        <Text color={getStatusColor(endpoint.status)}>{endpoint.status}</Text>
      </Box>

      {endpoint.namespaceId && (
        <Box>
          <Text bold>Namespace ID: </Text>
          <Text dimColor>{endpoint.namespaceId}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>MCP Servers ({endpoint.mcpServers?.length ?? 0}):</Text>
        </Box>
        {endpoint.mcpServers && endpoint.mcpServers.length > 0 ? (
          endpoint.mcpServers.map((server) => (
            <Box key={server.id} marginLeft={2}>
              <Text color="green">{server.name}</Text>
              <Text dimColor> ({server.transport})</Text>
            </Box>
          ))
        ) : (
          <Box marginLeft={2}>
            <Text dimColor>No MCP servers attached</Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>Created: </Text>
          <Text dimColor>{formatDateTime(endpoint.createdAt)}</Text>
        </Box>
        <Box>
          <Text bold>Updated: </Text>
          <Text dimColor>{formatDateTime(endpoint.updatedAt)}</Text>
        </Box>
      </Box>
    </Box>
  )
}
