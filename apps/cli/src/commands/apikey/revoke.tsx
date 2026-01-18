import { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { formatDate } from "../../lib/format"
import type { ApiKey, Endpoint } from "../../types/api"

interface ApiKeyListResponse {
  data: ApiKey[]
}

interface EndpointListResponse {
  data: Endpoint[]
}

export interface ApiKeyRevokeProps {
  keyId: string
  endpointId?: string
  confirm?: boolean
}

type RevokePhase =
  | "select-endpoint"
  | "loading"
  | "confirm"
  | "revoking"
  | "success"
  | "cancelled"
  | "error"

export function ApiKeyRevoke(props: ApiKeyRevokeProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<RevokePhase>(
    props.endpointId
      ? props.confirm
        ? "revoking"
        : "loading"
      : "select-endpoint"
  )
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(
    props.endpointId ?? null
  )
  const [keyInfo, setKeyInfo] = useState<ApiKey | null>(null)

  useEffect(() => {
    if (props.endpointId) return

    async function loadEndpoints() {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        setError(
          new Error("No organization selected. Run: athreei org switch <name>")
        )
        setPhase("error")
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
          setError(new Error("No endpoints found."))
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        if (data.data.length === 1 && data.data[0]) {
          setSelectedEndpoint(data.data[0].id)
          setPhase("loading")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch endpoints")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    loadEndpoints()
  }, [exit, props.endpointId])

  useEffect(() => {
    if (phase !== "loading" || !selectedEndpoint) return

    async function loadKeyInfo() {
      try {
        const client = getApiClient()
        const data = await client.get<ApiKeyListResponse>(
          `/api/endpoints/${selectedEndpoint}/keys`
        )

        const key = data.data.find((k) => k.id === props.keyId)
        if (!key) {
          setError(new Error(`API key not found: ${props.keyId}`))
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        setKeyInfo(key)

        if (props.confirm) {
          setPhase("revoking")
        } else {
          setPhase("confirm")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch API key")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    loadKeyInfo()
  }, [phase, selectedEndpoint, props.keyId, props.confirm, exit])

  useEffect(() => {
    if (phase !== "revoking" || !selectedEndpoint) return

    async function revokeKey() {
      try {
        const client = getApiClient()
        await client.delete(
          `/api/endpoints/${selectedEndpoint}/keys/${props.keyId}`
        )
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to revoke API key")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    revokeKey()
  }, [phase, selectedEndpoint, props.keyId, exit])

  const handleEndpointSelect = useCallback((item: { value: string }) => {
    setSelectedEndpoint(item.value)
    setPhase("loading")
  }, [])

  useInput(
    (input) => {
      if (phase !== "confirm") return

      if (input.toLowerCase() === "y") {
        setPhase("revoking")
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        setPhase("cancelled")
        setTimeout(() => exit(), 100)
      }
    },
    { isActive: phase === "confirm" }
  )

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="revoking API key" />
  }

  if (phase === "select-endpoint") {
    if (endpoints.length === 0) {
      return <LoadingSpinner message="Loading endpoints..." />
    }

    const endpointOptions = endpoints.map((ep) => ({
      label: `${ep.name} (${ep.slug})`,
      value: ep.id,
    }))

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Revoke API Key
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Select endpoint:</Text>
        </Box>
        <SelectInput items={endpointOptions} onSelect={handleEndpointSelect} />
      </Box>
    )
  }

  if (phase === "loading") {
    return <LoadingSpinner message="Loading API key..." />
  }

  if (phase === "confirm" && keyInfo) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Revoke API Key
          </Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text dimColor>Name: </Text>
            <Text bold>{keyInfo.name}</Text>
          </Box>
          <Box>
            <Text dimColor>ID: </Text>
            <Text>{keyInfo.id}</Text>
          </Box>
          <Box>
            <Text dimColor>Key hint: </Text>
            <Text>{keyInfo.keyHint}</Text>
          </Box>
          <Box>
            <Text dimColor>Created: </Text>
            <Text>{formatDate(keyInfo.createdAt)}</Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">
            Are you sure you want to revoke this API key?{" "}
          </Text>
          <Text bold>(y/n)</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Warning: This action cannot be undone. Any applications using this
            key will stop working.
          </Text>
        </Box>
      </Box>
    )
  }

  if (phase === "revoking") {
    return <LoadingSpinner message="Revoking API key..." />
  }

  if (phase === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">API key </Text>
          <Text bold>{keyInfo?.name ?? props.keyId}</Text>
          <Text color="green"> has been revoked</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Any applications using this key will no longer be able to
            authenticate.
          </Text>
        </Box>
      </Box>
    )
  }

  if (phase === "cancelled") {
    return (
      <Box padding={1}>
        <Text color="yellow">Cancelled. </Text>
        <Text dimColor>API key was not revoked.</Text>
      </Box>
    )
  }

  return null
}
