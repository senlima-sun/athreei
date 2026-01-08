import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"
import type { ApiKey, ApiKeyCreate, Endpoint } from "../lib/types.js"

// ============================================
// Response Types
// ============================================

interface ApiKeyListResponse {
  data: ApiKey[]
}

interface ApiKeyCreateResponse {
  data: ApiKeyCreate
}

interface EndpointListResponse {
  data: Endpoint[]
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

// ============================================
// ApiKeyList Component
// ============================================

interface ApiKeyListProps {
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

  // Fetch endpoints if no endpoint specified
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

        if (data.data.length === 1) {
          // Auto-select if only one endpoint
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

  // Fetch API keys when endpoint is selected
  useEffect(() => {
    if (!selectedEndpoint || phase !== "loading") return

    async function loadKeys() {
      setLoading(true)
      try {
        const client = getApiClient()
        const data = await client.get<ApiKeyListResponse>(
          `/api/endpoints/${selectedEndpoint}/keys`
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading API keys...</Text>
      </Box>
    )
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

  // JSON output mode
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

// ============================================
// ApiKeyCreate Component
// ============================================

interface ApiKeyCreateProps {
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

// Interactive text input component
function TextInputField({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
}) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit()
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1))
    } else if (!key.ctrl && !key.meta && input) {
      onChange(value + input)
    }
  })

  return (
    <Box>
      <Text color="cyan">{label}: </Text>
      <Text>{value || <Text dimColor>{placeholder ?? ""}</Text>}</Text>
      <Text color="green">|</Text>
    </Box>
  )
}

export function ApiKeyCreate(props: ApiKeyCreateProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<CreatePhase>(
    props.endpointId && props.name ? "creating" : "select-endpoint"
  )
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreate | null>(null)

  // Form state
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(
    props.endpointId ?? null
  )
  const [name, setName] = useState(props.name ?? "")
  const [expires, setExpires] = useState(props.expires ?? "")

  // Load endpoints if not provided
  useEffect(() => {
    if (props.endpointId) {
      if (props.name) {
        // All required fields provided - skip to creating
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

        if (data.data.length === 1) {
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

  // Create API key
  useEffect(() => {
    if (phase !== "creating") return

    async function createKey() {
      try {
        const client = getApiClient()
        const payload: { name: string; expiresAt?: string } = {
          name: name.trim(),
        }

        if (expires.trim()) {
          // Parse expiration date
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
      return (
        <Box padding={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Loading endpoints...</Text>
        </Box>
      )
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
        <TextInputField
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
        <TextInputField
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Creating API key...</Text>
      </Box>
    )
  }

  if (phase === "success" && createdKey) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color="green">✓ API key created successfully</Text>
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

// ============================================
// ApiKeyRevoke Component
// ============================================

interface ApiKeyRevokeProps {
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

  // Load endpoints if not provided
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

        if (data.data.length === 1) {
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

  // Load key info for confirmation
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

  // Revoke key
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

  // Handle keyboard input for confirmation
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
      return (
        <Box padding={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Loading endpoints...</Text>
        </Box>
      )
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading API key...</Text>
      </Box>
    )
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Revoking API key...</Text>
      </Box>
    )
  }

  if (phase === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓ </Text>
          <Text>
            API key <Text bold>{keyInfo?.name ?? props.keyId}</Text> has been
            revoked
          </Text>
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
