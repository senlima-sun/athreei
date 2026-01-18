import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { loadConfig, getConfigValue } from "../../lib/config-loader"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

export interface ConfigGetProps {
  configKey: string
}

export function ConfigGet(props: ConfigGetProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState<unknown>(undefined)
  const [found, setFound] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function getConfig() {
      try {
        const result = loadConfig()
        if (!result) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const configValue = getConfigValue(result.config, props.configKey)
        if (configValue === undefined) {
          setFound(false)
          process.exitCode = 1
        } else {
          setValue(configValue)
          setFound(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get config"))
        process.exitCode = 1
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    getConfig()
  }, [props.configKey, exit])

  if (loading) {
    return <LoadingSpinner message="Reading config..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="getting config value" />
  }

  if (!found) {
    return (
      <Box padding={1}>
        <Text color="red">Key not found: </Text>
        <Text>{props.configKey}</Text>
      </Box>
    )
  }

  const output =
    typeof value === "object" ? JSON.stringify(value) : String(value)
  process.stdout.write(output + "\n")

  return null
}
