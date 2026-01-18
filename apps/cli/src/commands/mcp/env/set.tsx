import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../../lib/api"
import { ErrorDisplay } from "../../../components/error"
import { LoadingSpinner } from "../../../components/loading-spinner"
import type { EnvVar } from "../../../types/api"

interface EnvVarResponse {
  data: EnvVar
}

export interface McpEnvSetProps {
  id: string
  envKey: string
  value: string
}

type EnvSetPhase = "setting" | "success" | "error"

export function McpEnvSet(props: McpEnvSetProps) {
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
    return <LoadingSpinner message="Setting environment variable..." />
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="setting environment variable" />
  }

  return (
    <Box padding={1}>
      <Text color="green">
        Environment variable <Text color="cyan">{props.envKey}</Text> set
        successfully
      </Text>
    </Box>
  )
}
