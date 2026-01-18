import { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { TextInput } from "../../components/text-input"
import { formatDate } from "../../lib/format"
import type {
  ApiKeyCreate as ApiKeyCreateType,
  Endpoint,
} from "../../types/api"

interface ApiKeyCreateResponse {
  data: ApiKeyCreateType
}

interface EndpointListResponse {
  data: Endpoint[]
}

export interface ApiKeyCreateProps {
  name?: string
  endpointId?: string
  expires?: string
}

type CreatePhase =
  | "select-endpoint"
  | "input-name"
  | "input-expires"
  | "confirm"
  | "creating"
  | "success"
  | "error"

export function ApiKeyCreate(props: ApiKeyCreateProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<CreatePhase>(
    props.endpointId && props.name ? "creating" : "select-endpoint"
  )
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateType | null>(null)

  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(
    props.endpointId ?? null
  )
  const [name, setName] = useState(props.name ?? "")
  const [expires, setExpires] = useState(props.expires ?? "")

  useEffect(() => {
    if (props.endpointId) {
      if (props.name) {
        setPhase("creating")
      } else {
        setPhase("input-name")
      }
      return
    }

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
          setError(new Error("No endpoints found. Create an endpoint first."))
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        if (data.data.length === 1 && data.data[0]) {
          setSelectedEndpoint(data.data[0].id)
          setPhase("input-name")
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
  }, [exit, props.endpointId, props.name])

  useEffect(() => {
    if (phase !== "creating") return

    async function createKey() {
      try {
        const client = getApiClient()
        const payload: { name: string; expiresAt?: string } = {
          name: name.trim(),
        }

        if (expires.trim()) {
          const expiresDate = new Date(expires.trim())
          if (isNaN(expiresDate.getTime())) {
            throw new Error(
              "Invalid expiration date. Use ISO format (e.g., 2024-12-31)"
            )
          }
          payload.expiresAt = expiresDate.toISOString()
        }

        const response = await client.post<ApiKeyCreateResponse>(
          `/api/endpoints/${selectedEndpoint}/keys`,
          payload
        )

        setCreatedKey(response.data)
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create API key")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    createKey()
  }, [phase, selectedEndpoint, name, expires, exit])

  const handleEndpointSelect = useCallback((item: { value: string }) => {
    setSelectedEndpoint(item.value)
    setPhase("input-name")
  }, [])

  const handleNameSubmit = useCallback(() => {
    if (!name.trim()) return
    setPhase("input-expires")
  }, [name])

  const handleExpiresSubmit = useCallback(() => {
    setPhase("confirm")
  }, [])

  const handleConfirmSelect = useCallback(
    (item: { value: string }) => {
      if (item.value === "yes") {
        setPhase("creating")
      } else {
        setTimeout(() => exit(), 100)
      }
    },
    [exit]
  )

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="creating API key" />
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
          <Text bold color="cyan">
            Create API Key
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Select endpoint:</Text>
        </Box>
        <SelectInput items={endpointOptions} onSelect={handleEndpointSelect} />
      </Box>
    )
  }

  if (phase === "input-name") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create API Key
          </Text>
        </Box>
        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          onSubmit={handleNameSubmit}
          placeholder="Enter key name (e.g., production-key)"
        />
      </Box>
    )
  }

  if (phase === "input-expires") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create API Key
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>Name: {name}</Text>
        </Box>
        <TextInput
          label="Expires (optional, ISO date)"
          value={expires}
          onChange={setExpires}
          onSubmit={handleExpiresSubmit}
          placeholder="Press Enter for no expiration"
        />
      </Box>
    )
  }

  if (phase === "confirm") {
    const confirmOptions = [
      { label: "Yes, create key", value: "yes" },
      { label: "No, cancel", value: "no" },
    ]

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create API Key
          </Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Review:</Text>
          <Box marginLeft={2}>
            <Text dimColor>Name: </Text>
            <Text>{name}</Text>
          </Box>
          {expires && (
            <Box marginLeft={2}>
              <Text dimColor>Expires: </Text>
              <Text>{expires}</Text>
            </Box>
          )}
        </Box>
        <Box marginTop={1}>
          <Text>Create this API key?</Text>
        </Box>
        <SelectInput items={confirmOptions} onSelect={handleConfirmSelect} />
      </Box>
    )
  }

  if (phase === "creating") {
    return <LoadingSpinner message="Creating API key..." />
  }

  if (phase === "success" && createdKey) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color="green">API key created successfully</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text dimColor>ID: </Text>
            <Text>{createdKey.id}</Text>
          </Box>
          <Box>
            <Text dimColor>Name: </Text>
            <Text>{createdKey.name}</Text>
          </Box>
          {createdKey.expiresAt && (
            <Box>
              <Text dimColor>Expires: </Text>
              <Text>{formatDate(createdKey.expiresAt)}</Text>
            </Box>
          )}
        </Box>

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={2}
          paddingY={1}
          marginTop={1}
        >
          <Box marginBottom={1}>
            <Text bold color="yellow">
              IMPORTANT: Save this key now!
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="red" bold>
              This key will NOT be shown again.
            </Text>
          </Box>
          <Box>
            <Text dimColor>Key: </Text>
            <Text color="green" bold>
              {createdKey.key}
            </Text>
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Tip: Copy this key to your clipboard or secure password manager.
          </Text>
        </Box>
      </Box>
    )
  }

  return null
}
