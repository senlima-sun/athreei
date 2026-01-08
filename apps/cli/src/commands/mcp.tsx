import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"
import type { McpServer, EnvVar, VerifyResult } from "../lib/types.js"

type TransportType = "stdio" | "sse" | "streamable-http"

interface McpServerResponse {
  data: McpServer
}

interface CreateMcpServerRequest {
  name: string
  description?: string
  transport: TransportType
  command?: string
  args?: string[]
  url?: string
  organizationId: string
}

interface CreateMcpServerResponse {
  id: string
  name: string
  transport: TransportType
  status: string
}

interface UpdateMcpServerRequest {
  name?: string
  description?: string
  transport?: TransportType
  command?: string
  args?: string[]
  url?: string
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

export function McpList(props: {
  search?: string
  status?: string
  transport?: string
  json?: boolean
}) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState<McpServer[]>([])
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
        if (props.search) params.append("search", props.search)
        if (props.status) params.append("status", props.status)
        if (props.transport) params.append("transport", props.transport)

        const client = getApiClient()
        const data = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        setServers(data.data)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch MCP servers")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.search, props.status, props.transport])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading MCP servers...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching MCP servers" />
  }

  // JSON output mode
  if (props.json) {
    console.log(JSON.stringify({ servers }, null, 2))
    return null
  }

  if (servers.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No MCP servers found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          MCP Servers ({servers.length})
        </Text>
      </Box>
      {servers.map((server) => (
        <Box key={server.id} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold>{server.name}</Text>
            <Text dimColor> ({server.status})</Text>
          </Box>
          {server.description && (
            <Box marginLeft={2}>
              <Text dimColor>{server.description}</Text>
            </Box>
          )}
          <Box marginLeft={2}>
            <Text dimColor>Transport: {server.transport}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

interface McpUpdateProps {
  id: string
  name?: string
  description?: string
  transport?: TransportType
  command?: string
  args?: string[]
  url?: string
  yes?: boolean
}

type UpdatePhase =
  | "loading"
  | "showing-diff"
  | "confirming"
  | "updating"
  | "success"
  | "error"

interface DiffEntry {
  field: string
  oldValue: string | null | undefined
  newValue: string | null | undefined
}

function formatValue(value: string | string[] | null | undefined): string {
  if (value === null || value === undefined) return "(not set)"
  if (Array.isArray(value))
    return value.length > 0 ? value.join(" ") : "(empty)"
  return value || "(empty)"
}

export function McpUpdate(props: McpUpdateProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<UpdatePhase>("loading")
  const [currentServer, setCurrentServer] = useState<McpServer | null>(null)
  const [diff, setDiff] = useState<DiffEntry[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [updatedServer, setUpdatedServer] = useState<McpServer | null>(null)

  // Build the update payload from props
  const buildUpdatePayload = useCallback((): UpdateMcpServerRequest => {
    const payload: UpdateMcpServerRequest = {}
    if (props.name !== undefined) payload.name = props.name
    if (props.description !== undefined) payload.description = props.description
    if (props.transport !== undefined) payload.transport = props.transport
    if (props.command !== undefined) payload.command = props.command
    if (props.args !== undefined) payload.args = props.args
    if (props.url !== undefined) payload.url = props.url
    return payload
  }, [props])

  // Compute diff between current values and updates
  const computeDiff = useCallback(
    (server: McpServer, updates: UpdateMcpServerRequest): DiffEntry[] => {
      const entries: DiffEntry[] = []

      if (updates.name !== undefined && updates.name !== server.name) {
        entries.push({
          field: "name",
          oldValue: server.name,
          newValue: updates.name,
        })
      }
      if (
        updates.description !== undefined &&
        updates.description !== server.description
      ) {
        entries.push({
          field: "description",
          oldValue: server.description,
          newValue: updates.description,
        })
      }
      if (
        updates.transport !== undefined &&
        updates.transport !== server.transport
      ) {
        entries.push({
          field: "transport",
          oldValue: server.transport,
          newValue: updates.transport,
        })
      }
      if (updates.command !== undefined && updates.command !== server.command) {
        entries.push({
          field: "command",
          oldValue: server.command,
          newValue: updates.command,
        })
      }
      if (updates.args !== undefined) {
        const oldArgs = server.args?.join(" ") ?? ""
        const newArgs = updates.args.join(" ")
        if (oldArgs !== newArgs) {
          entries.push({
            field: "args",
            oldValue: server.args?.join(" "),
            newValue: updates.args.join(" "),
          })
        }
      }
      if (updates.url !== undefined && updates.url !== server.url) {
        entries.push({
          field: "url",
          oldValue: server.url,
          newValue: updates.url,
        })
      }

      return entries
    },
    []
  )

  // Fetch current server and compute diff
  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const response = await client.get<McpServerResponse>(
          `/api/mcp-servers/${props.id}`
        )
        const server = response.data
        setCurrentServer(server)

        const updates = buildUpdatePayload()
        const diffEntries = computeDiff(server, updates)

        if (diffEntries.length === 0) {
          setError(new Error("No changes to apply"))
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        setDiff(diffEntries)

        if (props.yes) {
          // Skip confirmation, go straight to updating
          setPhase("updating")
        } else {
          setPhase("showing-diff")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch MCP server")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    load()
  }, [props.id, props.yes, buildUpdatePayload, computeDiff, exit])

  // Perform update when in updating phase
  useEffect(() => {
    if (phase !== "updating") return

    async function performUpdate() {
      try {
        const client = getApiClient()
        const updates = buildUpdatePayload()
        const response = await client.patch<McpServerResponse>(
          `/api/mcp-servers/${props.id}`,
          updates
        )
        setUpdatedServer(response.data)
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to update MCP server")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    performUpdate()
  }, [phase, props.id, buildUpdatePayload, exit])

  // Handle user input for confirmation
  useInput(
    (input, key) => {
      if (phase !== "showing-diff") return

      if (input.toLowerCase() === "y" || key.return) {
        setPhase("updating")
      } else if (input.toLowerCase() === "n" || key.escape) {
        setError(new Error("Update cancelled"))
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    },
    { isActive: phase === "showing-diff" }
  )

  if (phase === "loading") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Fetching MCP server...</Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="updating MCP server" />
  }

  if (phase === "showing-diff") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Update MCP Server: {currentServer?.name}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold>Changes to apply:</Text>
        </Box>

        {diff.map((entry) => (
          <Box
            key={entry.field}
            flexDirection="column"
            marginLeft={2}
            marginBottom={1}
          >
            <Text bold>{entry.field}:</Text>
            <Box marginLeft={2}>
              <Text color="red">- {formatValue(entry.oldValue)}</Text>
            </Box>
            <Box marginLeft={2}>
              <Text color="green">+ {formatValue(entry.newValue)}</Text>
            </Box>
          </Box>
        ))}

        <Box marginTop={1}>
          <Text>Apply changes? </Text>
          <Text color="yellow">[Y/n]</Text>
        </Box>
      </Box>
    )
  }

  if (phase === "updating") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Updating MCP server...</Text>
      </Box>
    )
  }

  if (phase === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color="green">✓ MCP server updated successfully</Text>
        </Box>
        {updatedServer && (
          <Box flexDirection="column" marginLeft={2}>
            <Text>Name: {updatedServer.name}</Text>
            <Text>Transport: {updatedServer.transport}</Text>
            {updatedServer.description && (
              <Text dimColor>Description: {updatedServer.description}</Text>
            )}
          </Box>
        )}
      </Box>
    )
  }

  return null
}

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
    case "pending":
      return "yellow"
    case "error":
      return "red"
    default:
      return "white"
  }
}

function EnvVarDisplay({
  envVar,
  showEnv,
}: {
  envVar: EnvVar
  showEnv: boolean
}) {
  const displayValue =
    showEnv && envVar.value ? envVar.value : envVar.masked ? "********" : ""

  return (
    <Box marginLeft={4}>
      <Text>
        <Text color="cyan">{envVar.key}</Text>
        <Text dimColor>=</Text>
        <Text color={showEnv ? "yellow" : "gray"}>{displayValue}</Text>
      </Text>
    </Box>
  )
}

export function McpDetails(props: { id: string; showEnv?: boolean }) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [server, setServer] = useState<McpServer | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const params = props.showEnv ? "?showEnv=true" : ""
        const data = await client.get<McpServerResponse>(
          `/api/mcp-servers/${props.id}${params}`
        )
        setServer(data.data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch MCP server details")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.id, props.showEnv])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading MCP server details...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching MCP server details" />
  }

  if (!server) {
    return (
      <Box padding={1}>
        <Text color="red">MCP server not found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          MCP Server Details
        </Text>
      </Box>

      {/* Name and Status */}
      <Box>
        <Text bold>Name: </Text>
        <Text>{server.name}</Text>
      </Box>
      <Box>
        <Text bold>ID: </Text>
        <Text dimColor>{server.id}</Text>
      </Box>
      <Box>
        <Text bold>Status: </Text>
        <Text color={getStatusColor(server.status)}>{server.status}</Text>
      </Box>

      {/* Description */}
      {server.description && (
        <Box>
          <Text bold>Description: </Text>
          <Text>{server.description}</Text>
        </Box>
      )}

      {/* Transport */}
      <Box marginTop={1}>
        <Text bold>Transport: </Text>
        <Text color="magenta">{server.transport}</Text>
      </Box>

      {/* Connection details based on transport type */}
      {server.transport === "stdio" && (
        <>
          {server.command && (
            <Box marginLeft={2}>
              <Text bold>Command: </Text>
              <Text color="green">{server.command}</Text>
            </Box>
          )}
          {server.args && server.args.length > 0 && (
            <Box marginLeft={2}>
              <Text bold>Args: </Text>
              <Text color="green">{server.args.join(" ")}</Text>
            </Box>
          )}
        </>
      )}

      {(server.transport === "sse" || server.transport === "streamable-http") &&
        server.url && (
          <Box marginLeft={2}>
            <Text bold>URL: </Text>
            <Text color="blue">{server.url}</Text>
          </Box>
        )}

      {/* Tools count */}
      {server.toolsCount !== undefined && (
        <Box marginTop={1}>
          <Text bold>Tools: </Text>
          <Text>{server.toolsCount}</Text>
        </Box>
      )}

      {/* Environment Variables */}
      {server.envVars && server.envVars.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Environment Variables:</Text>
            {!props.showEnv && (
              <Text dimColor> (use --show-env to reveal values)</Text>
            )}
          </Box>
          {server.envVars.map((envVar) => (
            <EnvVarDisplay
              key={envVar.key}
              envVar={envVar}
              showEnv={props.showEnv ?? false}
            />
          ))}
        </Box>
      )}

      {/* Timestamps */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>Created: </Text>
          <Text dimColor>{formatDate(server.createdAt)}</Text>
        </Box>
        <Box>
          <Text bold>Updated: </Text>
          <Text dimColor>{formatDate(server.updatedAt)}</Text>
        </Box>
      </Box>
    </Box>
  )
}

type DeleteState =
  | { phase: "loading" }
  | { phase: "confirm"; server: McpServer }
  | { phase: "deleting"; server: McpServer }
  | { phase: "success"; serverName: string }
  | { phase: "cancelled" }
  | { phase: "error"; error: Error | ApiError }

export function McpDelete(props: { id: string; confirm?: boolean }) {
  const { exit } = useApp()
  const [state, setState] = useState<DeleteState>({ phase: "loading" })

  // Fetch server details first
  useEffect(() => {
    async function fetchServer() {
      try {
        const client = getApiClient()
        const response = await client.get<McpServerResponse>(
          `/api/mcp-servers/${props.id}`
        )

        if (props.confirm) {
          // --confirm flag provided, proceed directly to deletion
          setState({ phase: "deleting", server: response.data })
        } else {
          // Show confirmation prompt
          setState({ phase: "confirm", server: response.data })
        }
      } catch (err) {
        setState({
          phase: "error",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to fetch MCP server"),
        })
        setTimeout(() => exit(), 100)
      }
    }

    fetchServer()
  }, [props.id, props.confirm, exit])

  // Handle deletion when in deleting phase
  useEffect(() => {
    if (state.phase !== "deleting") return

    const serverName = state.server.name

    async function deleteServer() {
      try {
        const client = getApiClient()
        await client.delete(`/api/mcp-servers/${props.id}`)
        setState({ phase: "success", serverName })
      } catch (err) {
        setState({
          phase: "error",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to delete MCP server"),
        })
      }
      setTimeout(() => exit(), 100)
    }

    deleteServer()
  }, [state, props.id, exit])

  // Handle keyboard input for confirmation
  const handleInput = useCallback(
    (input: string) => {
      if (state.phase !== "confirm") return

      if (input.toLowerCase() === "y") {
        setState({ phase: "deleting", server: state.server })
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
        <Text> Loading server details...</Text>
      </Box>
    )
  }

  if (state.phase === "confirm") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Delete MCP Server
          </Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text dimColor>Name: </Text>
            <Text bold>{state.server.name}</Text>
          </Box>
          <Box>
            <Text dimColor>ID: </Text>
            <Text>{state.server.id}</Text>
          </Box>
          <Box>
            <Text dimColor>Transport: </Text>
            <Text>{state.server.transport}</Text>
          </Box>
          {state.server.description && (
            <Box>
              <Text dimColor>Description: </Text>
              <Text>{state.server.description}</Text>
            </Box>
          )}
        </Box>
        <Box>
          <Text color="yellow">
            Are you sure you want to delete this server?{" "}
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
        <Text> Deleting {state.server.name}...</Text>
      </Box>
    )
  }

  if (state.phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">✓ </Text>
        <Text>
          Successfully deleted MCP server: <Text bold>{state.serverName}</Text>
        </Text>
      </Box>
    )
  }

  if (state.phase === "cancelled") {
    return (
      <Box padding={1}>
        <Text color="yellow">Cancelled. </Text>
        <Text dimColor>MCP server was not deleted.</Text>
      </Box>
    )
  }

  if (state.phase === "error") {
    return <ErrorDisplay error={state.error} context="deleting MCP server" />
  }

  return null
}

// Interactive text input component for McpCreate
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

type CreateStep =
  | "name"
  | "description"
  | "transport"
  | "command"
  | "args"
  | "url"
  | "confirm"

interface McpCreateProps {
  name?: string
  description?: string
  transport?: string
  command?: string
  args?: string
  url?: string
}

export function McpCreate(props: McpCreateProps) {
  const { exit } = useApp()
  const [status, setStatus] = useState<
    "input" | "creating" | "success" | "error"
  >("input")
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(props.name ?? "")
  const [description, setDescription] = useState(props.description ?? "")
  const [transport, setTransport] = useState<TransportType | null>(
    (props.transport as TransportType) ?? null
  )
  const [command, setCommand] = useState(props.command ?? "")
  const [args, setArgs] = useState(props.args ?? "")
  const [url, setUrl] = useState(props.url ?? "")

  // Interactive mode step tracking
  const isInteractive = !props.name && !props.transport
  const [step, setStep] = useState<CreateStep>("name")

  // Check if we have all required fields from props
  const hasRequiredFromProps = useCallback(() => {
    if (!props.name || !props.transport) return false
    const t = props.transport as TransportType
    if (t === "stdio" && !props.command) return false
    if ((t === "sse" || t === "streamable-http") && !props.url) return false
    return true
  }, [props.name, props.transport, props.command, props.url])

  // Validate current form state
  const validateForm = useCallback((): string | null => {
    if (!name.trim()) return "Name is required"
    if (!transport) return "Transport is required"
    if (transport === "stdio" && !command.trim()) {
      return "Command is required for stdio transport"
    }
    if (
      (transport === "sse" || transport === "streamable-http") &&
      !url.trim()
    ) {
      return "URL is required for SSE/HTTP transport"
    }
    return null
  }, [name, transport, command, url])

  // Submit the form
  const submitForm = useCallback(async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(new Error(validationError))
      setStatus("error")
      setTimeout(() => exit(), 100)
      return
    }

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
      const payload: CreateMcpServerRequest = {
        name: name.trim(),
        transport: transport!,
        organizationId: orgId,
      }

      if (description.trim()) {
        payload.description = description.trim()
      }

      if (transport === "stdio") {
        payload.command = command.trim()
        if (args.trim()) {
          payload.args = args.split(/\s+/).filter(Boolean)
        }
      } else {
        payload.url = url.trim()
      }

      const response = await client.post<CreateMcpServerResponse>(
        "/api/mcp-servers",
        payload
      )

      setCreatedId(response.id)
      setStatus("success")
      setTimeout(() => exit(), 100)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to create MCP server")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [name, description, transport, command, args, url, validateForm, exit])

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
        setStep("description")
        break
      case "description":
        setStep("transport")
        break
      case "transport":
        if (!transport) return
        if (transport === "stdio") {
          setStep("command")
        } else {
          setStep("url")
        }
        break
      case "command":
        if (!command.trim()) return
        setStep("args")
        break
      case "args":
        setStep("confirm")
        break
      case "url":
        if (!url.trim()) return
        setStep("confirm")
        break
      case "confirm":
        submitForm()
        break
    }
  }, [step, name, transport, command, url, submitForm])

  // Handle transport selection
  const handleTransportSelect = useCallback((item: { value: string }) => {
    setTransport(item.value as TransportType)
    if (item.value === "stdio") {
      setStep("command")
    } else {
      setStep("url")
    }
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

  const transportOptions = [
    { label: "stdio - Run a local command", value: "stdio" },
    { label: "sse - Server-Sent Events endpoint", value: "sse" },
    {
      label: "streamable-http - HTTP streaming endpoint",
      value: "streamable-http",
    },
  ]

  const confirmOptions = [
    { label: "Yes, create server", value: "yes" },
    { label: "No, cancel", value: "no" },
  ]

  if (status === "creating") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Creating MCP server...</Text>
      </Box>
    )
  }

  if (status === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓ MCP server created successfully</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>ID: </Text>
          <Text color="cyan">{createdId}</Text>
        </Box>
        <Box>
          <Text dimColor>Name: </Text>
          <Text>{name}</Text>
        </Box>
        <Box>
          <Text dimColor>Transport: </Text>
          <Text>{transport}</Text>
        </Box>
      </Box>
    )
  }

  if (status === "error" && error) {
    return <ErrorDisplay error={error} context="creating MCP server" />
  }

  // Interactive mode
  if (isInteractive) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create MCP Server
          </Text>
        </Box>

        {step === "name" && (
          <TextInputField
            label="Name"
            value={name}
            onChange={setName}
            onSubmit={nextStep}
            placeholder="Enter server name"
          />
        )}

        {step === "description" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <TextInputField
              label="Description (optional)"
              value={description}
              onChange={setDescription}
              onSubmit={nextStep}
              placeholder="Press Enter to skip"
            />
          </>
        )}

        {step === "transport" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            {description && (
              <Box marginBottom={1}>
                <Text dimColor>Description: {description}</Text>
              </Box>
            )}
            <Box marginBottom={1}>
              <Text color="cyan">Transport: </Text>
            </Box>
            <SelectInput
              items={transportOptions}
              onSelect={handleTransportSelect}
            />
          </>
        )}

        {step === "command" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <TextInputField
              label="Command"
              value={command}
              onChange={setCommand}
              onSubmit={nextStep}
              placeholder="e.g., npx or /usr/bin/node"
            />
          </>
        )}

        {step === "args" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Command: {command}</Text>
            </Box>
            <TextInputField
              label="Args (optional, space-separated)"
              value={args}
              onChange={setArgs}
              onSubmit={nextStep}
              placeholder="Press Enter to skip"
            />
          </>
        )}

        {step === "url" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <TextInputField
              label="URL"
              value={url}
              onChange={setUrl}
              onSubmit={nextStep}
              placeholder="https://example.com/mcp"
            />
          </>
        )}

        {step === "confirm" && (
          <>
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Review:</Text>
              <Box marginLeft={2}>
                <Text dimColor>Name: </Text>
                <Text>{name}</Text>
              </Box>
              {description && (
                <Box marginLeft={2}>
                  <Text dimColor>Description: </Text>
                  <Text>{description}</Text>
                </Box>
              )}
              <Box marginLeft={2}>
                <Text dimColor>Transport: </Text>
                <Text>{transport}</Text>
              </Box>
              {transport === "stdio" && (
                <>
                  <Box marginLeft={2}>
                    <Text dimColor>Command: </Text>
                    <Text>{command}</Text>
                  </Box>
                  {args && (
                    <Box marginLeft={2}>
                      <Text dimColor>Args: </Text>
                      <Text>{args}</Text>
                    </Box>
                  )}
                </>
              )}
              {(transport === "sse" || transport === "streamable-http") && (
                <Box marginLeft={2}>
                  <Text dimColor>URL: </Text>
                  <Text>{url}</Text>
                </Box>
              )}
            </Box>
            <Box marginTop={1}>
              <Text color="cyan">Create this server? </Text>
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

interface McpVerifyProps {
  id: string
  timeout?: number
}

interface VerifyResponse {
  data: VerifyResult
}

type VerifyState =
  | { phase: "verifying" }
  | { phase: "success"; result: VerifyResult }
  | { phase: "error"; error: Error | ApiError }

export function McpVerify(props: McpVerifyProps) {
  const { exit } = useApp()
  const [state, setState] = useState<VerifyState>({ phase: "verifying" })
  const timeout = props.timeout ?? 10000

  useEffect(() => {
    async function verify() {
      try {
        const client = getApiClient()
        const response = await client.post<VerifyResponse>(
          `/api/mcp-servers/${props.id}/verify`,
          undefined,
          { timeout }
        )

        if (response.data.success) {
          setState({ phase: "success", result: response.data })
        } else {
          // API returned success: false - treat as verification failure
          setState({ phase: "success", result: response.data })
        }
      } catch (err) {
        setState({
          phase: "error",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to verify MCP server"),
        })
      }
      setTimeout(() => exit(), 100)
    }

    verify()
  }, [props.id, timeout, exit])

  if (state.phase === "verifying") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Verifying MCP server connectivity...</Text>
      </Box>
    )
  }

  if (state.phase === "error") {
    return <ErrorDisplay error={state.error} context="verifying MCP server" />
  }

  if (state.phase === "success") {
    const { result } = state

    if (result.success) {
      return (
        <Box flexDirection="column" padding={1}>
          <Box>
            <Text color="green">✓ </Text>
            <Text color="green" bold>
              MCP server is reachable
            </Text>
          </Box>

          {result.latency !== undefined && (
            <Box marginLeft={2} marginTop={1}>
              <Text dimColor>Latency: </Text>
              <Text color="cyan">{result.latency}ms</Text>
            </Box>
          )}

          {result.toolCount !== undefined && (
            <Box marginLeft={2}>
              <Text dimColor>Tools discovered: </Text>
              <Text color="cyan">{result.toolCount}</Text>
            </Box>
          )}
        </Box>
      )
    } else {
      return (
        <Box flexDirection="column" padding={1}>
          <Box>
            <Text color="red">✗ </Text>
            <Text color="red" bold>
              MCP server verification failed
            </Text>
          </Box>

          {result.error && (
            <Box marginLeft={2} marginTop={1}>
              <Text dimColor>Error: </Text>
              <Text color="yellow">{result.error}</Text>
            </Box>
          )}

          {result.latency !== undefined && (
            <Box marginLeft={2} marginTop={1}>
              <Text dimColor>Latency: </Text>
              <Text color="cyan">{result.latency}ms</Text>
            </Box>
          )}
        </Box>
      )
    }
  }

  return null
}

// Types for the tools response
interface ToolInputSchema {
  type: "object"
  properties?: Record<string, { type: string; description?: string }>
  required?: string[]
}

interface McpToolItem {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

interface McpToolsResponse {
  tools: McpToolItem[]
}

function formatSchemaType(schema: ToolInputSchema): string {
  if (!schema.properties) return "(no parameters)"

  const props = Object.entries(schema.properties)
  if (props.length === 0) return "(no parameters)"

  const required = new Set(schema.required ?? [])
  return props
    .map(([name, prop]) => {
      const isRequired = required.has(name)
      return `${name}${isRequired ? "" : "?"}: ${prop.type}`
    })
    .join(", ")
}

export function McpTools(props: { id: string; json?: boolean }) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [tools, setTools] = useState<McpToolItem[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const data = await client.get<McpToolsResponse>(
          `/api/mcp-servers/${props.id}/tools`
        )
        setTools(data.tools)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch MCP tools")
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
        <Text> Loading MCP server tools...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching MCP server tools" />
  }

  // JSON output mode
  if (props.json) {
    console.log(JSON.stringify({ tools }, null, 2))
    return null
  }

  if (tools.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No tools found for this MCP server</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          MCP Server Tools ({tools.length})
        </Text>
      </Box>
      {tools.map((tool) => (
        <Box key={tool.name} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color="green">
              {tool.name}
            </Text>
          </Box>
          {tool.description && (
            <Box marginLeft={2}>
              <Text>{tool.description}</Text>
            </Box>
          )}
          <Box marginLeft={2}>
            <Text dimColor>Parameters: </Text>
            <Text color="magenta">{formatSchemaType(tool.inputSchema)}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

// ============================================
// Environment Variable Commands
// ============================================

interface EnvVarListResponse {
  data: EnvVar[]
}

interface EnvVarResponse {
  data: EnvVar
}

export function McpEnvList(props: { id: string; show?: boolean }) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [serverName, setServerName] = useState<string>("")
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const client = getApiClient()
        const params = props.show ? "?showValues=true" : ""
        const data = await client.get<EnvVarListResponse>(
          `/api/mcp-servers/${props.id}/env${params}`
        )
        setEnvVars(data.data)

        // Also fetch server name for display
        const serverResponse = await client.get<McpServerResponse>(
          `/api/mcp-servers/${props.id}`
        )
        setServerName(serverResponse.data.name)
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch environment variables")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.id, props.show])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading environment variables...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <ErrorDisplay error={error} context="fetching environment variables" />
    )
  }

  if (envVars.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Environment Variables: {serverName || props.id}
          </Text>
        </Box>
        <Text dimColor>No environment variables configured</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Environment Variables: {serverName || props.id}
        </Text>
        {!props.show && <Text dimColor> (use --show to reveal values)</Text>}
      </Box>
      {envVars.map((envVar) => (
        <Box key={envVar.key}>
          <Text color="cyan">{envVar.key}</Text>
          <Text dimColor>=</Text>
          <Text color={props.show ? "yellow" : "gray"}>
            {props.show && envVar.value ? envVar.value : "********"}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

type EnvSetPhase = "setting" | "success" | "error"

export function McpEnvSet(props: {
  id: string
  envKey: string
  value: string
}) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<EnvSetPhase>("setting")
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function setEnvVar() {
      try {
        const client = getApiClient()
        await client.post<EnvVarResponse>(`/api/mcp-servers/${props.id}/env`, {
          key: props.envKey,
          value: props.value,
        })
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to set environment variable")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    setEnvVar()
  }, [exit, props.id, props.envKey, props.value])

  if (phase === "setting") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Setting environment variable...</Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="setting environment variable" />
  }

  return (
    <Box padding={1}>
      <Text color="green">✓ </Text>
      <Text>
        Environment variable <Text color="cyan">{props.envKey}</Text> set
        successfully
      </Text>
    </Box>
  )
}

type EnvDeletePhase =
  | "confirming"
  | "deleting"
  | "success"
  | "cancelled"
  | "error"

export function McpEnvDelete(props: {
  id: string
  envKey: string
  confirm?: boolean
}) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<EnvDeletePhase>(
    props.confirm ? "deleting" : "confirming"
  )
  const [error, setError] = useState<Error | ApiError | null>(null)

  // Handle deletion
  useEffect(() => {
    if (phase !== "deleting") return

    async function deleteEnvVar() {
      try {
        const client = getApiClient()
        await client.delete(
          `/api/mcp-servers/${props.id}/env/${encodeURIComponent(props.envKey)}`
        )
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to delete environment variable")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    deleteEnvVar()
  }, [phase, props.id, props.envKey, exit])

  // Handle keyboard input for confirmation
  useInput(
    (input) => {
      if (phase !== "confirming") return

      if (input.toLowerCase() === "y") {
        setPhase("deleting")
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        setPhase("cancelled")
        setTimeout(() => exit(), 100)
      }
    },
    { isActive: phase === "confirming" }
  )

  if (phase === "confirming") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Delete Environment Variable
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>
            Are you sure you want to delete{" "}
            <Text color="cyan">{props.envKey}</Text>?
          </Text>
        </Box>
        <Box>
          <Text color="yellow">(y/n)</Text>
        </Box>
      </Box>
    )
  }

  if (phase === "deleting") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Deleting environment variable...</Text>
      </Box>
    )
  }

  if (phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">✓ </Text>
        <Text>
          Environment variable <Text color="cyan">{props.envKey}</Text> deleted
        </Text>
      </Box>
    )
  }

  if (phase === "cancelled") {
    return (
      <Box padding={1}>
        <Text color="yellow">Cancelled. </Text>
        <Text dimColor>Environment variable was not deleted.</Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return (
      <ErrorDisplay error={error} context="deleting environment variable" />
    )
  }

  return null
}
