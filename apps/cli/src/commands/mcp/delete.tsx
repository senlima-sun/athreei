import { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import type { McpServer } from "../../types/api"
import type { McpServerResponse } from "./types"

type DeleteState =
  | { phase: "loading" }
  | { phase: "confirm"; server: McpServer }
  | { phase: "deleting"; server: McpServer }
  | { phase: "success"; serverName: string }
  | { phase: "cancelled" }
  | { phase: "error"; error: Error | ApiError }

export interface McpDeleteProps {
  id: string
  confirm?: boolean
}

export function McpDelete(props: McpDeleteProps) {
  const { exit } = useApp()
  const [state, setState] = useState<DeleteState>({ phase: "loading" })

  useEffect(() => {
    async function fetchServer() {
      try {
        const client = getApiClient()
        const response = await client.get<McpServerResponse>(
          `/api/mcp-servers/${props.id}`
        )

        if (props.confirm) {
          setState({ phase: "deleting", server: response.data })
        } else {
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

  const handleInput = useCallback(
    (input: string) => {
      if (state.phase !== "confirm") return

      if (input.toLowerCase() === "y") {
        setState({ phase: "deleting", server: state.server })
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        setState({ phase: "cancelled" })
        setTimeout(() => exit(), 100)
      }
    },
    [state, exit]
  )

  useInput(handleInput, { isActive: state.phase === "confirm" })

  if (state.phase === "loading") {
    return <LoadingSpinner message="Loading server details..." />
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
    return <LoadingSpinner message={`Deleting ${state.server.name}...`} />
  }

  if (state.phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">
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
