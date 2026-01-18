import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { configSchema } from "../../lib/config-schema"
import { findConfig } from "../../lib/config-loader"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

interface ValidationError {
  path: string
  message: string
}

export function ConfigValidate() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    async function validate() {
      try {
        const path = findConfig()
        if (!path) {
          setLoadError(
            new Error(
              "No config file found. Run 'athreei config init' to create one."
            )
          )
          process.exitCode = 1
          setLoading(false)
          setTimeout(() => exit(), 100)
          return
        }

        setConfigPath(path)

        const { readFileSync } = await import("fs")
        const raw = readFileSync(path, "utf-8")

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch (parseErr) {
          setErrors([
            {
              path: "root",
              message:
                parseErr instanceof Error
                  ? parseErr.message
                  : "Invalid JSON syntax",
            },
          ])
          process.exitCode = 1
          setLoading(false)
          setTimeout(() => exit(), 100)
          return
        }

        const result = configSchema.safeParse(parsed)
        if (result.success) {
          setValid(true)
        } else {
          const validationErrors: ValidationError[] = result.error.errors.map(
            (err) => ({
              path: err.path.join(".") || "root",
              message: err.message,
            })
          )
          setErrors(validationErrors)
          process.exitCode = 1
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err : new Error("Failed to validate config")
        )
        process.exitCode = 1
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    validate()
  }, [exit])

  if (loading) {
    return <LoadingSpinner message="Validating config..." />
  }

  if (loadError) {
    return <ErrorDisplay error={loadError} context="validating config" />
  }

  if (valid) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green" bold>
            Config is valid
          </Text>
        </Box>

        <Box marginTop={1} marginLeft={2}>
          <Text dimColor>Path: </Text>
          <Text color="cyan">{configPath}</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="red" bold>
          Config validation failed
        </Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>Path: </Text>
        <Text color="cyan">{configPath}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Errors:</Text>
        {errors.map((err, index) => (
          <Box key={index} marginLeft={2}>
            <Text color="red">- </Text>
            <Text color="yellow">{err.path}</Text>
            <Text>: {err.message}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
