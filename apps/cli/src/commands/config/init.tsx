import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import { existsSync } from "fs"
import { defaultConfig, type Config } from "../../lib/config-schema.js"
import { writeConfig, getDefaultConfigPath } from "../../lib/config-loader.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { getApiClient } from "../../lib/api.js"

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

export interface ConfigInitProps {
  path?: string
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

  const configExists = existsSync(configPath)

  const fetchOrganizations = useCallback(async () => {
    try {
      const api = getApiClient()
      const data = await api.get<VerifyResponse>("/api/auth/cli/verify")

      if (data.valid && data.organizations && data.organizations.length > 0) {
        setOrgs(data.organizations)
        setIsAuthenticated(true)
        setStep("org-select")
      } else {
        setIsAuthenticated(false)
        setStep("creating")
      }
    } catch {
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
    return <LoadingSpinner message="Creating config file..." />
  }

  if (step === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
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
