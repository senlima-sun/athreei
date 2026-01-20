import { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { formatDate, formatDateTime, isExpired } from "../../lib/format"
import type { ApiKey, Endpoint } from "../../types/api"

interface ApiKeyListResponse {
  data: ApiKey[]
}

interface EndpointListResponse {
  data: Endpoint[]
}

export interface ApiKeyListProps {
  endpointId?: string
  json?: boolean
}

export function ApiKeyList(props: ApiKeyListProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(
    props.endpointId ?? null
  )
  const [phase, setPhase] = useState<"select-endpoint" | "loading" | "display">(
    props.endpointId ? "loading" : "select-endpoint"
  )

  useEffect(() => {
    if (props.endpointId) return

    async function loadEndpoints() {
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
        const client = getApiClient()
        const data = await client.get<EndpointListResponse>(
          `/api/endpoints?organizationId=${orgId}`
        )
        setEndpoints(data.data)

        if (data.data.length === 0) {
          setError(new Error("No endpoints found. Create an endpoint first."))
          setLoading(false)
          setTimeout(() => exit(), 100)
          return
        }

        if (data.data.length === 1 && data.data[0]) {
          setSelectedEndpoint(data.data[0].id)
          setPhase("loading")
        } else {
          setLoading(false)
          setPhase("select-endpoint")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch endpoints")
        )
        setLoading(false)
        setTimeout(() => exit(), 100)
      }
    }

    loadEndpoints()
  }, [exit, props.endpointId])

  useEffect(() => {
    if (!selectedEndpoint || phase !== "loading") return

    async function loadKeys() {
      setLoading(true)
      try {
        const client = getApiClient()
        const data = await client.get<ApiKeyListResponse>(
          `/api/api-keys/${selectedEndpoint}/keys`
        )
        setKeys(data.data)
        setPhase("display")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch API keys")
        )
      }
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    loadKeys()
  }, [exit, selectedEndpoint, phase])

  const handleEndpointSelect = useCallback((item: { value: string }) => {
    setSelectedEndpoint(item.value)
    setPhase("loading")
  }, [])

  if (loading && phase !== "select-endpoint") {
    return <LoadingSpinner message="Loading API keys..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching API keys" />
  }

  if (phase === "select-endpoint") {
    const endpointOptions = endpoints.map((ep) => ({
      label: `${ep.name} (${ep.slug})`,
      value: ep.id,
    }))

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Select Endpoint
          </Text>
        </Box>
        <SelectInput items={endpointOptions} onSelect={handleEndpointSelect} />
      </Box>
    )
  }

  if (props.json) {
    console.log(JSON.stringify({ keys }, null, 2))
    return null
  }

  if (keys.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No API keys found for this endpoint</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          API Keys ({keys.length})
        </Text>
      </Box>
      {keys.map((key) => (
        <Box key={key.id} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold>{key.name}</Text>
            <Text dimColor> ({key.keyHint})</Text>
            {key.expiresAt && isExpired(key.expiresAt) && (
              <Text color="red"> [EXPIRED]</Text>
            )}
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>ID: </Text>
            <Text>{key.id}</Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>Created: </Text>
            <Text>{formatDate(key.createdAt)}</Text>
          </Box>
          {key.expiresAt && (
            <Box marginLeft={2}>
              <Text dimColor>Expires: </Text>
              <Text color={isExpired(key.expiresAt) ? "red" : "white"}>
                {formatDate(key.expiresAt)}
              </Text>
            </Box>
          )}
          {key.lastUsedAt && (
            <Box marginLeft={2}>
              <Text dimColor>Last used: </Text>
              <Text>{formatDateTime(key.lastUsedAt)}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}
