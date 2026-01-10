import React, { useState, useEffect } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { getApiClient, ApiError } from "../../../lib/api.js"
import { ErrorDisplay } from "../../../components/error.js"
import { LoadingSpinner } from "../../../components/loading-spinner.js"

export interface McpEnvDeleteProps {
  id: string
  envKey: string
  confirm?: boolean
}

type EnvDeletePhase =
  | "confirming"
  | "deleting"
  | "success"
  | "cancelled"
  | "error"

export function McpEnvDelete(props: McpEnvDeleteProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<EnvDeletePhase>(
    props.confirm ? "deleting" : "confirming"
  )
  const [error, setError] = useState<Error | ApiError | null>(null)

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
    return <LoadingSpinner message="Deleting environment variable..." />
  }

  if (phase === "success") {
    return (
      <Box padding={1}>
        <Text color="green">
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
