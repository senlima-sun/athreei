import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { formatDateTime, getStatusColor } from "../../lib/format"
import type { McpServer, EnvVar } from "../../types/api"
import type { McpServerResponse } from "./types"

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

export interface McpDetailsProps {
  id: string
  showEnv?: boolean
  json?: boolean
}

export function McpDetails(props: McpDetailsProps) {
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
    return <LoadingSpinner message="Loading MCP server details..." />
  }

  if (error) {
    if (props.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
      return null
    }
    return <ErrorDisplay error={error} context="fetching MCP server details" />
  }

  if (props.json) {
    console.log(JSON.stringify({ server }, null, 2))
    return null
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

      {server.description && (
        <Box>
          <Text bold>Description: </Text>
          <Text>{server.description}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text bold>Transport: </Text>
        <Text color="magenta">{server.transport}</Text>
      </Box>

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

      {server.toolsCount !== undefined && (
        <Box marginTop={1}>
          <Text bold>Tools: </Text>
          <Text>{server.toolsCount}</Text>
        </Box>
      )}

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

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>Created: </Text>
          <Text dimColor>{formatDateTime(server.createdAt)}</Text>
        </Box>
        <Box>
          <Text bold>Updated: </Text>
          <Text dimColor>{formatDateTime(server.updatedAt)}</Text>
        </Box>
      </Box>
    </Box>
  )
}
