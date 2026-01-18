import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { formatSchemaType } from "../../lib/format"
import type { McpToolsResponse, McpToolItem } from "./types"

export interface McpToolsProps {
  id: string
  json?: boolean
}

export function McpTools(props: McpToolsProps) {
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
    return <LoadingSpinner message="Loading MCP server tools..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching MCP server tools" />
  }

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
