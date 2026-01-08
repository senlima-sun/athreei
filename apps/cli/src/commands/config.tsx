import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { existsSync } from "fs"
import { ZodError } from "zod"
import {
  configSchema,
  defaultConfig,
  type Config,
} from "../lib/config-schema.js"
import {
  loadConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
  getDefaultConfigPath,
  findConfig,
} from "../lib/config-loader.js"
import { ErrorDisplay } from "../components/error.js"
import { getApiClient } from "../lib/api.js"

// ============================================
// ConfigInit - Initialize config file
// ============================================

interface OrganizationOption {
  id: string
  name: string
  slug: string
}

interface VerifyResponse {
  valid: boolean
  organizations?: OrganizationOption[]
}

type InitStep = "api-url" | "org-select" | "creating" | "success" | "error"

interface ConfigInitProps {
  path?: string
}

function TextInputField({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
}) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit()
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1))
    } else if (!key.ctrl && !key.meta && input) {
      onChange(value + input)
    }
  })

  return (
    <Box>
      <Text color="cyan">{label}: </Text>
      <Text>{value || <Text dimColor>{placeholder ?? ""}</Text>}</Text>
      <Text color="green">|</Text>
    </Box>
  )
}

export function ConfigInit(props: ConfigInitProps) {
  const { exit } = useApp()
  const [step, setStep] = useState<InitStep>("api-url")
  const [apiUrl, setApiUrl] = useState("https://api.athreei.com")
  const [orgs, setOrgs] = useState<OrganizationOption[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>()
  const [error, setError] = useState<Error | null>(null)
  const [configPath] = useState<string>(props.path ?? getDefaultConfigPath())
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if config already exists
  const configExists = existsSync(configPath)

  // Fetch organizations after API URL is set
  const fetchOrganizations = useCallback(async () => {
    try {
      const api = getApiClient()
      const data = await api.get<VerifyResponse>("/api/auth/cli/verify")

      if (data.valid && data.organizations && data.organizations.length > 0) {
        setOrgs(data.organizations)
        setIsAuthenticated(true)
        setStep("org-select")
      } else {
        // Not authenticated or no orgs - skip org selection
        setIsAuthenticated(false)
        setStep("creating")
      }
    } catch {
      // Auth error or network error - skip org selection
      setIsAuthenticated(false)
      setStep("creating")
    }
  }, [])

  const handleApiUrlSubmit = useCallback(() => {
    if (!apiUrl.trim()) {
      setApiUrl("https://api.athreei.com")
    }
    fetchOrganizations()
  }, [apiUrl, fetchOrganizations])

  const handleOrgSelect = useCallback((item: { value: string }) => {
    if (item.value === "__skip__") {
      setSelectedOrg(undefined)
    } else {
      setSelectedOrg(item.value)
    }
    setStep("creating")
  }, [])

  // Create config when in creating step
  useEffect(() => {
    if (step !== "creating") return

    async function createConfig() {
      try {
        const config: Config = {
          ...defaultConfig,
          apiUrl: apiUrl.trim() || "https://api.athreei.com",
          defaultOrg: selectedOrg,
        }

        writeConfig(config, configPath)
        setStep("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create config")
        )
        setStep("error")
      }
      setTimeout(() => exit(), 100)
    }

    createConfig()
  }, [step, apiUrl, selectedOrg, configPath, exit])

  if (step === "error" && error) {
    return <ErrorDisplay error={error} context="initializing config" />
  }

  if (step === "api-url") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Initialize athreei.config.json
          </Text>
        </Box>

        {configExists && (
          <Box marginBottom={1}>
            <Text color="yellow">Warning: </Text>
            <Text>Config file already exists at {configPath}</Text>
          </Box>
        )}

        <TextInputField
          label="API URL"
          value={apiUrl}
          onChange={setApiUrl}
          onSubmit={handleApiUrlSubmit}
          placeholder="https://api.athreei.com"
        />

        <Box marginTop={1}>
          <Text dimColor>Press Enter to continue</Text>
        </Box>
      </Box>
    )
  }

  if (step === "org-select") {
    const orgOptions = [
      ...orgs.map((org) => ({
        label: `${org.name} (${org.slug})`,
        value: org.id,
      })),
      { label: "Skip - No default organization", value: "__skip__" },
    ]

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Initialize athreei.config.json
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor>API URL: {apiUrl}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Select default organization:</Text>
        </Box>

        <SelectInput items={orgOptions} onSelect={handleOrgSelect} />
      </Box>
    )
  }

  if (step === "creating") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Creating config file...</Text>
      </Box>
    )
  }

  if (step === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓ </Text>
          <Text color="green" bold>
            Config file created successfully
          </Text>
        </Box>

        <Box marginTop={1} marginLeft={2}>
          <Text dimColor>Path: </Text>
          <Text color="cyan">{configPath}</Text>
        </Box>

        <Box marginLeft={2}>
          <Text dimColor>API URL: </Text>
          <Text>{apiUrl}</Text>
        </Box>

        {selectedOrg && (
          <Box marginLeft={2}>
            <Text dimColor>Default Org: </Text>
            <Text>
              {orgs.find((o) => o.id === selectedOrg)?.name ?? selectedOrg}
            </Text>
          </Box>
        )}

        {!isAuthenticated && (
          <Box marginTop={1}>
            <Text dimColor>
              Tip: Run &apos;athreei auth login&apos; to authenticate
            </Text>
          </Box>
        )}
      </Box>
    )
  }

  return null
}

// ============================================
// ConfigShow - Display current config
// ============================================

interface ConfigShowProps {
  showSecrets?: boolean
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading config...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="loading config" />
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

// ============================================
// ConfigSet - Set a config value
// ============================================

interface ConfigSetProps {
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

        // Get old value
        const previousValue = getConfigValue(config, props.configKey)
        setOldValue(previousValue)

        // Parse value (try JSON first, fall back to string)
        let parsedValue: unknown = props.value
        try {
          parsedValue = JSON.parse(props.value)
        } catch {
          // Keep as string if not valid JSON
        }

        // Set new value (this validates against schema)
        const updatedConfig = setConfigValue(
          config,
          props.configKey,
          parsedValue
        )
        setNewValue(parsedValue)

        // Write config atomically
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Updating config...</Text>
      </Box>
    )
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
          <Text color="green">✓ </Text>
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

// ============================================
// ConfigGet - Get a single config value
// ============================================

interface ConfigGetProps {
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Reading config...</Text>
      </Box>
    )
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

  // Output raw value for script consumption
  const output =
    typeof value === "object" ? JSON.stringify(value) : String(value)
  process.stdout.write(output + "\n")

  return null
}

// ============================================
// ConfigValidate - Validate config file
// ============================================

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

        // Try to parse the file
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

        // Validate against schema
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Validating config...</Text>
      </Box>
    )
  }

  if (loadError) {
    return <ErrorDisplay error={loadError} context="validating config" />
  }

  if (valid) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓ </Text>
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
        <Text color="red">✗ </Text>
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
