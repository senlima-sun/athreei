import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { TextInput } from "../../components/text-input.js"
import type {
  TransportType,
  CreateMcpServerRequest,
  CreateMcpServerResponse,
} from "./types.js"

export interface McpCreateProps {
  name?: string
  description?: string
  transport?: string
  command?: string
  args?: string
  url?: string
}

type CreateStep =
  | "name"
  | "description"
  | "transport"
  | "command"
  | "args"
  | "url"
  | "confirm"

export function McpCreate(props: McpCreateProps) {
  const { exit } = useApp()
  const [status, setStatus] = useState<
    "input" | "creating" | "success" | "error"
  >("input")
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const [name, setName] = useState(props.name ?? "")
  const [description, setDescription] = useState(props.description ?? "")
  const [transport, setTransport] = useState<TransportType | null>(
    (props.transport as TransportType) ?? null
  )
  const [command, setCommand] = useState(props.command ?? "")
  const [args, setArgs] = useState(props.args ?? "")
  const [url, setUrl] = useState(props.url ?? "")

  const isInteractive = !props.name && !props.transport
  const [step, setStep] = useState<CreateStep>("name")

  const hasRequiredFromProps = useCallback(() => {
    if (!props.name || !props.transport) return false
    const t = props.transport as TransportType
    if (t === "stdio" && !props.command) return false
    if ((t === "sse" || t === "streamable-http") && !props.url) return false
    return true
  }, [props.name, props.transport, props.command, props.url])

  const validateForm = useCallback((): string | null => {
    if (!name.trim()) return "Name is required"
    if (!transport) return "Transport is required"
    if (transport === "stdio" && !command.trim()) {
      return "Command is required for stdio transport"
    }
    if (
      (transport === "sse" || transport === "streamable-http") &&
      !url.trim()
    ) {
      return "URL is required for SSE/HTTP transport"
    }
    return null
  }, [name, transport, command, url])

  const submitForm = useCallback(async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(new Error(validationError))
      setStatus("error")
      setTimeout(() => exit(), 100)
      return
    }

    setStatus("creating")

    try {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        throw new Error(
          "No organization selected. Run: athreei org switch <name>"
        )
      }

      const client = getApiClient()
      const payload: CreateMcpServerRequest = {
        name: name.trim(),
        transport: transport!,
        organizationId: orgId,
      }

      if (description.trim()) {
        payload.description = description.trim()
      }

      if (transport === "stdio") {
        payload.command = command.trim()
        if (args.trim()) {
          payload.args = args.split(/\s+/).filter(Boolean)
        }
      } else {
        payload.url = url.trim()
      }

      const response = await client.post<CreateMcpServerResponse>(
        "/api/mcp-servers",
        payload
      )

      setCreatedId(response.id)
      setStatus("success")
      setTimeout(() => exit(), 100)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to create MCP server")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [name, description, transport, command, args, url, validateForm, exit])

  useEffect(() => {
    if (hasRequiredFromProps() && status === "input") {
      submitForm()
    }
  }, [hasRequiredFromProps, submitForm, status])

  const nextStep = useCallback(() => {
    switch (step) {
      case "name":
        if (!name.trim()) return
        setStep("description")
        break
      case "description":
        setStep("transport")
        break
      case "transport":
        if (!transport) return
        if (transport === "stdio") {
          setStep("command")
        } else {
          setStep("url")
        }
        break
      case "command":
        if (!command.trim()) return
        setStep("args")
        break
      case "args":
        setStep("confirm")
        break
      case "url":
        if (!url.trim()) return
        setStep("confirm")
        break
      case "confirm":
        submitForm()
        break
    }
  }, [step, name, transport, command, url, submitForm])

  const handleTransportSelect = useCallback((item: { value: string }) => {
    setTransport(item.value as TransportType)
    if (item.value === "stdio") {
      setStep("command")
    } else {
      setStep("url")
    }
  }, [])

  const handleConfirmSelect = useCallback(
    (item: { value: string }) => {
      if (item.value === "yes") {
        submitForm()
      } else {
        setTimeout(() => exit(), 100)
      }
    },
    [submitForm, exit]
  )

  const transportOptions = [
    { label: "stdio - Run a local command", value: "stdio" },
    { label: "sse - Server-Sent Events endpoint", value: "sse" },
    {
      label: "streamable-http - HTTP streaming endpoint",
      value: "streamable-http",
    },
  ]

  const confirmOptions = [
    { label: "Yes, create server", value: "yes" },
    { label: "No, cancel", value: "no" },
  ]

  if (status === "creating") {
    return <LoadingSpinner message="Creating MCP server..." />
  }

  if (status === "success") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">MCP server created successfully</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>ID: </Text>
          <Text color="cyan">{createdId}</Text>
        </Box>
        <Box>
          <Text dimColor>Name: </Text>
          <Text>{name}</Text>
        </Box>
        <Box>
          <Text dimColor>Transport: </Text>
          <Text>{transport}</Text>
        </Box>
      </Box>
    )
  }

  if (status === "error" && error) {
    return <ErrorDisplay error={error} context="creating MCP server" />
  }

  if (isInteractive) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create MCP Server
          </Text>
        </Box>

        {step === "name" && (
          <TextInput
            label="Name"
            value={name}
            onChange={setName}
            onSubmit={nextStep}
            placeholder="Enter server name"
          />
        )}

        {step === "description" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <TextInput
              label="Description (optional)"
              value={description}
              onChange={setDescription}
              onSubmit={nextStep}
              placeholder="Press Enter to skip"
            />
          </>
        )}

        {step === "transport" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            {description && (
              <Box marginBottom={1}>
                <Text dimColor>Description: {description}</Text>
              </Box>
            )}
            <Box marginBottom={1}>
              <Text color="cyan">Transport: </Text>
            </Box>
            <SelectInput
              items={transportOptions}
              onSelect={handleTransportSelect}
            />
          </>
        )}

        {step === "command" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <TextInput
              label="Command"
              value={command}
              onChange={setCommand}
              onSubmit={nextStep}
              placeholder="e.g., npx or /usr/bin/node"
            />
          </>
        )}

        {step === "args" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Command: {command}</Text>
            </Box>
            <TextInput
              label="Args (optional, space-separated)"
              value={args}
              onChange={setArgs}
              onSubmit={nextStep}
              placeholder="Press Enter to skip"
            />
          </>
        )}

        {step === "url" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Transport: {transport}</Text>
            </Box>
            <TextInput
              label="URL"
              value={url}
              onChange={setUrl}
              onSubmit={nextStep}
              placeholder="https://example.com/mcp"
            />
          </>
        )}

        {step === "confirm" && (
          <>
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Review:</Text>
              <Box marginLeft={2}>
                <Text dimColor>Name: </Text>
                <Text>{name}</Text>
              </Box>
              {description && (
                <Box marginLeft={2}>
                  <Text dimColor>Description: </Text>
                  <Text>{description}</Text>
                </Box>
              )}
              <Box marginLeft={2}>
                <Text dimColor>Transport: </Text>
                <Text>{transport}</Text>
              </Box>
              {transport === "stdio" && (
                <>
                  <Box marginLeft={2}>
                    <Text dimColor>Command: </Text>
                    <Text>{command}</Text>
                  </Box>
                  {args && (
                    <Box marginLeft={2}>
                      <Text dimColor>Args: </Text>
                      <Text>{args}</Text>
                    </Box>
                  )}
                </>
              )}
              {(transport === "sse" || transport === "streamable-http") && (
                <Box marginLeft={2}>
                  <Text dimColor>URL: </Text>
                  <Text>{url}</Text>
                </Box>
              )}
            </Box>
            <Box marginTop={1}>
              <Text color="cyan">Create this server? </Text>
            </Box>
            <SelectInput
              items={confirmOptions}
              onSelect={handleConfirmSelect}
            />
          </>
        )}
      </Box>
    )
  }

  return <LoadingSpinner message="Validating..." />
}
