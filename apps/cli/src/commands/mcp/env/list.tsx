import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../../lib/api"
import { ErrorDisplay } from "../../../components/error"
import { LoadingSpinner } from "../../../components/loading-spinner"
import type { EnvVar } from "../../../types/api"
import type { McpServerResponse } from "../types"

interface EnvVarListResponse {
  data: EnvVar[]
}

export interface McpEnvListProps {
  id: string
  show?: boolean
}

export function McpEnvList(props: McpEnvListProps) {
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
    return <LoadingSpinner message="Loading environment variables..." />
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
