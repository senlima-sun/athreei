import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { ZodError } from "zod"
import {
  loadConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
} from "../../lib/config-loader.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"

export interface ConfigSetProps {
  configKey: string
  value: string
}

export function ConfigSet(props: ConfigSetProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [oldValue, setOldValue] = useState<unknown>(undefined)
  const [newValue, setNewValue] = useState<unknown>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)

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

        const previousValue = getConfigValue(config, props.configKey)
        setOldValue(previousValue)

        let parsedValue: unknown = props.value
        try {
          parsedValue = JSON.parse(props.value)
        } catch {
          // Keep as string if not valid JSON
        }

        const updatedConfig = setConfigValue(
          config,
          props.configKey,
          parsedValue
        )
        setNewValue(parsedValue)

        writeConfig(updatedConfig, path)
        setSuccess(true)
      } catch (err) {
        if (err instanceof ZodError) {
          const messages = err.errors.map((e) => e.message).join(", ")
          setError(new Error(`Invalid value: ${messages}`))
        } else {
          setError(
            err instanceof Error ? err : new Error("Failed to set config")
          )
        }
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    updateConfig()
  }, [props.configKey, props.value, exit])

  if (loading) {
    return <LoadingSpinner message="Updating config..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="setting config value" />
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
          <Text color="green" bold>
            Config updated
          </Text>
        </Box>

        <Box marginTop={1} marginLeft={2}>
          <Text bold>{props.configKey}: </Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="red">- {formatValue(oldValue)}</Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="green">+ {formatValue(newValue)}</Text>
        </Box>
      </Box>
    )
  }

  return null
}
