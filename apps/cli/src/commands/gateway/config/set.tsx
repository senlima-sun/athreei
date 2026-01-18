import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { ErrorDisplay } from "../../../components/error"
import { LoadingSpinner } from "../../../components/loading-spinner"
import {
  loadConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
} from "../../../lib/config-loader"

export interface GatewayConfigSetProps {
  configKey: string
  value: string
}

export function GatewayConfigSet(props: GatewayConfigSetProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)
  const [oldValue, setOldValue] = useState<unknown>(undefined)
  const [newValue, setNewValue] = useState<unknown>(undefined)

  useEffect(() => {
    async function updateConfig() {
      try {
        const result = loadConfig()
        if (!result) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const { config, path } = result
        const fullKey = `gateway.${props.configKey}`

        const previousValue = getConfigValue(config, fullKey)
        setOldValue(previousValue)

        let parsedValue: unknown = props.value
        try {
          parsedValue = JSON.parse(props.value)
        } catch {
          // Keep as string
        }

        const validKeys = ["port", "logLevel"]
        if (!validKeys.includes(props.configKey)) {
          throw new Error(
            `Invalid gateway config key: ${props.configKey}. Valid keys: ${validKeys.join(", ")}`
          )
        }

        const updatedConfig = setConfigValue(config, fullKey, parsedValue)
        setNewValue(parsedValue)

        writeConfig(updatedConfig, path)
        setSuccess(true)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to set gateway config")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    updateConfig()
  }, [props.configKey, props.value, exit])

  if (loading) {
    return <LoadingSpinner message="Updating gateway config..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="setting gateway config" />
  }

  if (success) {
    const formatValue = (val: unknown): string => {
      if (val === undefined) return "(not set)"
      if (typeof val === "object") return JSON.stringify(val)
      return String(val)
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">Gateway config updated</Text>
        </Box>

        <Box marginTop={1} marginLeft={2}>
          <Text bold>gateway.{props.configKey}: </Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="red">- {formatValue(oldValue)}</Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="green">+ {formatValue(newValue)}</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Restart the gateway for changes to take effect.</Text>
        </Box>
      </Box>
    )
  }

  return null
}
