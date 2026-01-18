import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { ErrorDisplay } from "../../../components/error"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { loadConfig } from "../../../lib/config-loader"
import type { Config } from "../../../lib/config-schema"

export function GatewayConfigShow() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Config["gateway"] | null>(null)
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = loadConfig()
        if (result) {
          setConfig(result.config.gateway ?? null)
          setConfigPath(result.path)
        } else {
          setError(
            new Error(
              "No config file found. Run 'athreei config init' to create one."
            )
          )
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load config")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return <LoadingSpinner message="Loading gateway config..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="loading gateway config" />
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Gateway Configuration
        </Text>
      </Box>

      {configPath && (
        <Box marginBottom={1}>
          <Text dimColor>Config file: </Text>
          <Text color="cyan">{configPath}</Text>
        </Box>
      )}

      {!config ? (
        <Box>
          <Text dimColor>No gateway configuration set (using defaults)</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          <Box>
            <Text bold>port: </Text>
            <Text color="cyan">{config.port ?? 8080}</Text>
          </Box>
          <Box>
            <Text bold>logLevel: </Text>
            <Text color="cyan">{config.logLevel ?? "info"}</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Default values: port=8080, logLevel=info</Text>
      </Box>
    </Box>
  )
}
