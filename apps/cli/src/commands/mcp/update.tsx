import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { getApiClient, ApiError } from "../../lib/api.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import type { McpServer } from "../../types/api.js"
import type {
  TransportType,
  McpServerResponse,
  UpdateMcpServerRequest,
} from "./types.js"

export interface McpUpdateProps {
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
    return <LoadingSpinner message="Fetching MCP server..." />
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
    return <LoadingSpinner message="Updating MCP server..." />
  }

  if (phase === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color="green">MCP server updated successfully</Text>
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
