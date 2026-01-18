import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import type { VerifyResult } from "../../types/api"

interface VerifyResponse {
  data: VerifyResult
}

type VerifyState =
  | { phase: "verifying" }
  | { phase: "success"; result: VerifyResult }
  | { phase: "error"; error: Error | ApiError }

export interface McpVerifyProps {
  id: string
  timeout?: number
}

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

        setState({ phase: "success", result: response.data })
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
    return <LoadingSpinner message="Verifying MCP server connectivity..." />
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
