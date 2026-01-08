import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"
import type { Endpoint, McpServer } from "../lib/types.js"

interface EndpointResponse {
  data: Endpoint
}

interface EndpointListResponse {
  data: Endpoint[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface CreateEndpointRequest {
  name: string
  slug: string
  organizationId: string
  namespaceId?: string
  mcpServerIds?: string[]
}

interface CreateEndpointResponse {
  data: Endpoint
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "green"
    case "inactive":
      return "gray"
    default:
      return "white"
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// ============================================
// EndpointList Component
// ============================================

export function EndpointList(props: { json?: boolean }) {
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading endpoints...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching endpoints" />
  }

  // JSON output mode
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

// ============================================
// EndpointDetails Component
// ============================================

export function EndpointDetails(props: { id: string }) {
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading endpoint details...</Text>
      </Box>
    )
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

      {/* Name and Status */}
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

      {/* Namespace */}
      {endpoint.namespaceId && (
        <Box>
          <Text bold>Namespace ID: </Text>
          <Text dimColor>{endpoint.namespaceId}</Text>
        </Box>
      )}

      {/* MCP Servers */}
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

      {/* Timestamps */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>Created: </Text>
          <Text dimColor>{formatDate(endpoint.createdAt)}</Text>
        </Box>
        <Box>
          <Text bold>Updated: </Text>
          <Text dimColor>{formatDate(endpoint.updatedAt)}</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ============================================
// EndpointCreate Component
// ============================================

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

type CreateStep = "name" | "slug" | "servers" | "confirm"

interface EndpointCreateProps {
  name?: string
  slug?: string
  namespace?: string
}

export function EndpointCreate(props: EndpointCreateProps) {
  const { exit } = useApp()
  const [status, setStatus] = useState<
    "input" | "loading-servers" | "creating" | "success" | "error"
  >("input")
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdEndpoint, setCreatedEndpoint] = useState<Endpoint | null>(null)

  // Form state
  const [name, setName] = useState(props.name ?? "")
  const [slug, setSlug] = useState(props.slug ?? "")
  const [namespaceId] = useState(props.namespace ?? "")
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [availableServers, setAvailableServers] = useState<McpServer[]>([])

  // Interactive mode step tracking
  const isInteractive = !props.name
  const [step, setStep] = useState<CreateStep>("name")

  // Check if we have all required fields from props
  const hasRequiredFromProps = useCallback(() => {
    return !!props.name && !!props.slug
  }, [props.name, props.slug])

  // Load available MCP servers
  const loadServers = useCallback(async () => {
    setStatus("loading-servers")
    try {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        throw new Error(
          "No organization selected. Run: athreei org switch <name>"
        )
      }

      const client = getApiClient()
      const params = new URLSearchParams({
        organizationId: orgId,
        limit: "50",
      })
      const data = await client.get<McpServerListResponse>(
        `/api/mcp-servers?${params.toString()}`
      )
      setAvailableServers(data.data)
      setStatus("input")
      setStep("servers")
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load MCP servers")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [exit])

  // Submit the form
  const submitForm = useCallback(async () => {
    if (!name.trim()) {
      setError(new Error("Name is required"))
      setStatus("error")
      setTimeout(() => exit(), 100)
      return
    }

    const finalSlug = slug.trim() || generateSlug(name)

    setStatus("creating")

    try {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        throw new Error(
          "No organization selected. Run: athreei org switch <name>"
        )
      }

      const client = getApiClient()
      const payload: CreateEndpointRequest = {
        name: name.trim(),
        slug: finalSlug,
        organizationId: orgId,
      }

      if (namespaceId) {
        payload.namespaceId = namespaceId
      }

      if (selectedServerIds.length > 0) {
        payload.mcpServerIds = selectedServerIds
      }

      const response = await client.post<CreateEndpointResponse>(
        "/api/endpoints",
        payload
      )

      setCreatedEndpoint(response.data)
      setStatus("success")
      setTimeout(() => exit(), 100)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to create endpoint")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [name, slug, namespaceId, selectedServerIds, exit])

  // Auto-submit if all required props provided
  useEffect(() => {
    if (hasRequiredFromProps() && status === "input") {
      submitForm()
    }
  }, [hasRequiredFromProps, submitForm, status])

  // Handle step progression in interactive mode
  const nextStep = useCallback(() => {
    switch (step) {
      case "name":
        if (!name.trim()) return
        // Auto-generate slug from name
        if (!slug) {
          setSlug(generateSlug(name))
        }
        setStep("slug")
        break
      case "slug":
        loadServers()
        break
      case "servers":
        setStep("confirm")
        break
      case "confirm":
        submitForm()
        break
    }
  }, [step, name, slug, loadServers, submitForm])

  // Toggle server selection
  const toggleServer = useCallback((serverId: string) => {
    setSelectedServerIds((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    )
  }, [])

  // Handle confirm selection
  const handleConfirmSelect = useCallback(
    (item: { value: string }) => {
      if (item.value === "yes") {
        submitForm()
      } else {
        setTimeout(() => exit(), 100)
      }
    },
    [submitForm, exit]
  )

  const confirmOptions = [
    { label: "Yes, create endpoint", value: "yes" },
    { label: "No, cancel", value: "no" },
  ]

  if (status === "loading-servers") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading available MCP servers...</Text>
      </Box>
    )
  }

  if (status === "creating") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Creating endpoint...</Text>
      </Box>
    )
  }

  if (status === "success" && createdEndpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓ Endpoint created successfully</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>ID: </Text>
          <Text color="cyan">{createdEndpoint.id}</Text>
        </Box>
        <Box>
          <Text dimColor>Name: </Text>
          <Text>{createdEndpoint.name}</Text>
        </Box>
        <Box>
          <Text dimColor>Slug: </Text>
          <Text>{createdEndpoint.slug}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={getStatusColor(createdEndpoint.status)}>
            {createdEndpoint.status}
          </Text>
        </Box>
        {createdEndpoint.mcpServers &&
          createdEndpoint.mcpServers.length > 0 && (
            <Box marginTop={1}>
              <Text dimColor>MCP Servers: </Text>
              <Text>{createdEndpoint.mcpServers.length} attached</Text>
            </Box>
          )}
      </Box>
    )
  }

  if (status === "error" && error) {
    return <ErrorDisplay error={error} context="creating endpoint" />
  }

  // Interactive mode
  if (isInteractive) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create Endpoint
          </Text>
        </Box>

        {step === "name" && (
          <TextInputField
            label="Name"
            value={name}
            onChange={setName}
            onSubmit={nextStep}
            placeholder="Enter endpoint name"
          />
        )}

        {step === "slug" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <TextInputField
              label="Slug"
              value={slug}
              onChange={setSlug}
              onSubmit={nextStep}
              placeholder={generateSlug(name) || "Enter slug"}
            />
          </>
        )}

        {step === "servers" && (
          <ServerSelector
            servers={availableServers}
            selectedIds={selectedServerIds}
            onToggle={toggleServer}
            onDone={nextStep}
          />
        )}

        {step === "confirm" && (
          <>
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Review:</Text>
              <Box marginLeft={2}>
                <Text dimColor>Name: </Text>
                <Text>{name}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text dimColor>Slug: </Text>
                <Text>{slug || generateSlug(name)}</Text>
              </Box>
              {namespaceId && (
                <Box marginLeft={2}>
                  <Text dimColor>Namespace: </Text>
                  <Text>{namespaceId}</Text>
                </Box>
              )}
              <Box marginLeft={2}>
                <Text dimColor>MCP Servers: </Text>
                <Text>{selectedServerIds.length} selected</Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text color="cyan">Create this endpoint? </Text>
            </Box>
            <SelectInput
              items={confirmOptions}
              onSelect={handleConfirmSelect}
            />
          </>
        )}
      </Box>
    )
  }

  // Non-interactive mode - wait for auto-submit or show validation
  return (
    <Box padding={1}>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text> Validating...</Text>
    </Box>
  )
}

// Server selection component
function ServerSelector({
  servers,
  selectedIds,
  onToggle,
  onDone,
}: {
  servers: McpServer[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onDone: () => void
}) {
  const [cursor, setCursor] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setCursor((prev) => Math.min(servers.length, prev + 1))
    } else if (input === " " && cursor < servers.length) {
      onToggle(servers[cursor].id)
    } else if (key.return) {
      onDone()
    }
  })

  if (servers.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No MCP servers available to attach.</Text>
        <Box marginTop={1}>
          <Text dimColor>Press Enter to continue...</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Select MCP servers (Space to toggle, Enter when done):
      </Text>
      <Box marginTop={1} flexDirection="column">
        {servers.map((server, index) => {
          const isSelected = selectedIds.includes(server.id)
          const isCursor = cursor === index
          return (
            <Box key={server.id}>
              <Text color={isCursor ? "cyan" : undefined}>
                {isCursor ? ">" : " "} [{isSelected ? "x" : " "}]{" "}
              </Text>
              <Text>{server.name}</Text>
              <Text dimColor> ({server.transport})</Text>
            </Box>
          )
        })}
        <Box marginTop={1}>
          <Text color={cursor === servers.length ? "cyan" : undefined}>
            {cursor === servers.length ? ">" : " "} [Done - Press Enter]
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

// ============================================
// EndpointDelete Component
// ============================================

type DeleteState =
  | { phase: "loading" }
  | { phase: "confirm"; endpoint: Endpoint }
  | { phase: "deleting"; endpoint: Endpoint }
  | { phase: "success"; endpointName: string }
  | { phase: "cancelled" }
  | { phase: "error"; error: Error | ApiError }

export function EndpointDelete(props: { id: string; confirm?: boolean }) {
  const { exit } = useApp()
  const [state, setState] = useState<DeleteState>({ phase: "loading" })

  // Fetch endpoint details first
  useEffect(() => {
    async function fetchEndpoint() {
      try {
        const client = getApiClient()
        const response = await client.get<EndpointResponse>(
          `/api/endpoints/${props.id}`
        )

        if (props.confirm) {
          // --confirm flag provided, proceed directly to deletion
          setState({ phase: "deleting", endpoint: response.data })
        } else {
          // Show confirmation prompt
          setState({ phase: "confirm", endpoint: response.data })
        }
      } catch (err) {
        setState({
          phase: "error",
          error:
            err instanceof Error ? err : new Error("Failed to fetch endpoint"),
        })
        setTimeout(() => exit(), 100)
      }
    }

    fetchEndpoint()
  }, [props.id, props.confirm, exit])

  // Handle deletion when in deleting phase
  useEffect(() => {
    if (state.phase !== "deleting") return

    const endpointName = state.endpoint.name

    async function deleteEndpoint() {
      try {
        const client = getApiClient()
        await client.delete(`/api/endpoints/${props.id}`)
        setState({ phase: "success", endpointName })
      } catch (err) {
        setState({
          phase: "error",
          error:
            err instanceof Error ? err : new Error("Failed to delete endpoint"),
        })
      }
      setTimeout(() => exit(), 100)
    }

    deleteEndpoint()
  }, [state, props.id, exit])

  // Handle keyboard input for confirmation
  const handleInput = useCallback(
    (input: string) => {
      if (state.phase !== "confirm") return

      if (input.toLowerCase() === "y") {
        setState({ phase: "deleting", endpoint: state.endpoint })
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        // 'n' or Escape
        setState({ phase: "cancelled" })
        setTimeout(() => exit(), 100)
      }
    },
    [state, exit]
  )

  useInput(handleInput, { isActive: state.phase === "confirm" })

  if (state.phase === "loading") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading endpoint details...</Text>
      </Box>
    )
  }

  if (state.phase === "confirm") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Delete Endpoint
          </Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text dimColor>Name: </Text>
            <Text bold>{state.endpoint.name}</Text>
          </Box>
          <Box>
            <Text dimColor>Slug: </Text>
            <Text>{state.endpoint.slug}</Text>
          </Box>
          <Box>
            <Text dimColor>ID: </Text>
            <Text>{state.endpoint.id}</Text>
          </Box>
          <Box>
            <Text dimColor>MCP Servers: </Text>
            <Text>{state.endpoint.mcpServers?.length ?? 0}</Text>
          </Box>
        </Box>
        <Box marginBottom={1}>
          <Text color="yellow">
            Warning: This will invalidate any API keys associated with this
            endpoint.
          </Text>
        </Box>
        <Box>
          <Text color="yellow">
            Are you sure you want to delete this endpoint?{" "}
          </Text>
          <Text bold>(y/n)</Text>
        </Box>
      </Box>
    )
  }

  if (state.phase === "deleting") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Deleting {state.endpoint.name}...</Text>
      </Box>
    )
  }

  if (state.phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">✓ </Text>
        <Text>
          Successfully deleted endpoint: <Text bold>{state.endpointName}</Text>
        </Text>
      </Box>
    )
  }

  if (state.phase === "cancelled") {
    return (
      <Box padding={1}>
        <Text color="yellow">Cancelled. </Text>
        <Text dimColor>Endpoint was not deleted.</Text>
      </Box>
    )
  }

  if (state.phase === "error") {
    return <ErrorDisplay error={state.error} context="deleting endpoint" />
  }

  return null
}
