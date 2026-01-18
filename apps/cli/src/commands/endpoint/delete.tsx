import { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import type { Endpoint } from "../../types/api"

interface EndpointResponse {
  data: Endpoint
}

type DeleteState =
  | { phase: "loading" }
  | { phase: "confirm"; endpoint: Endpoint }
  | { phase: "deleting"; endpoint: Endpoint }
  | { phase: "success"; endpointName: string }
  | { phase: "cancelled" }
  | { phase: "error"; error: Error | ApiError }

export interface EndpointDeleteProps {
  id: string
  confirm?: boolean
}

export function EndpointDelete(props: EndpointDeleteProps) {
  const { exit } = useApp()
  const [state, setState] = useState<DeleteState>({ phase: "loading" })

  useEffect(() => {
    async function fetchEndpoint() {
      try {
        const client = getApiClient()
        const response = await client.get<EndpointResponse>(
          `/api/endpoints/${props.id}`
        )

        if (props.confirm) {
          setState({ phase: "deleting", endpoint: response.data })
        } else {
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

  const handleInput = useCallback(
    (input: string) => {
      if (state.phase !== "confirm") return

      if (input.toLowerCase() === "y") {
        setState({ phase: "deleting", endpoint: state.endpoint })
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        setState({ phase: "cancelled" })
        setTimeout(() => exit(), 100)
      }
    },
    [state, exit]
  )

  useInput(handleInput, { isActive: state.phase === "confirm" })

  if (state.phase === "loading") {
    return <LoadingSpinner message="Loading endpoint details..." />
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
    return <LoadingSpinner message={`Deleting ${state.endpoint.name}...`} />
  }

  if (state.phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">Successfully deleted endpoint: </Text>
        <Text bold>{state.endpointName}</Text>
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
