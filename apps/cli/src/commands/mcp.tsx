import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"
import type { McpServer, EnvVar } from "../lib/types.js"

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
            err instanceof Error ? err : new Error("Failed to fetch MCP server"),
        })
        setTimeout(() => exit(), 100)
      }
    }

    fetchServer()
  }, [props.id, props.confirm, exit])

  // Handle deletion when in deleting phase
  useEffect(() => {
    if (state.phase !== "deleting") return

    async function deleteServer() {
      try {
        const client = getApiClient()
        await client.delete(`/api/mcp-servers/${props.id}`)
        setState({ phase: "success", serverName: state.server.name })
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
