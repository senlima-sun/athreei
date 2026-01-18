import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import type { Config } from "../../lib/config-schema"
import { loadConfig } from "../../lib/config-loader"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

export interface ConfigShowProps {
  showSecrets?: boolean
  json?: boolean
}

export function ConfigShow(props: ConfigShowProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Config | null>(null)
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = loadConfig()
        if (result) {
          setConfig(result.config)
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
    return <LoadingSpinner message="Loading config..." />
  }

  if (error) {
    if (props.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
      return null
    }
    return <ErrorDisplay error={error} context="loading config" />
  }

  if (props.json) {
    console.log(
      JSON.stringify(
        {
          path: configPath,
          config: config,
        },
        null,
        2
      )
    )
    return null
  }

  if (!config) {
    return (
      <Box padding={1}>
        <Text color="yellow">No config found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Current Configuration
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Config file: </Text>
        <Text color="cyan">{configPath}</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text bold>version: </Text>
          <Text>{config.version}</Text>
        </Box>

        <Box>
          <Text bold>apiUrl: </Text>
          <Text>{config.apiUrl}</Text>
        </Box>

        <Box>
          <Text bold>defaultOrg: </Text>
          <Text>{config.defaultOrg ?? "(not set)"}</Text>
        </Box>

        {config.gateway && (
          <Box flexDirection="column">
            <Text bold>gateway:</Text>
            <Box marginLeft={2}>
              <Text>port: </Text>
              <Text color="cyan">{config.gateway.port}</Text>
            </Box>
            <Box marginLeft={2}>
              <Text>logLevel: </Text>
              <Text color="cyan">{config.gateway.logLevel}</Text>
            </Box>
          </Box>
        )}

        {config.mcpServers && config.mcpServers.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>mcpServers: </Text>
            {config.mcpServers.map((server, index) => (
              <Box key={index} flexDirection="column" marginLeft={2}>
                <Text color="green">- {server.name}</Text>
                <Box marginLeft={4}>
                  <Text dimColor>transport: {server.transport}</Text>
                </Box>
                {server.command && (
                  <Box marginLeft={4}>
                    <Text dimColor>command: {server.command}</Text>
                  </Box>
                )}
                {server.url && (
                  <Box marginLeft={4}>
                    <Text dimColor>url: {server.url}</Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {!props.showSecrets && (
        <Box marginTop={1}>
          <Text dimColor>Use --show-secrets to reveal sensitive values</Text>
        </Box>
      )}
    </Box>
  )
}
