import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { getStatusColor } from "../../lib/format.js"
import type { Endpoint, McpServer } from "../../types/api.js"

interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface CreateEndpointRequest {
  name: string
  slug: string
  organizationId: string
  namespaceId?: string
  mcpServerIds?: string[]
}

interface CreateEndpointResponse {
  data: Endpoint
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
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

function ServerSelector({
  servers,
  selectedIds,
  onToggle,
  onDone,
}: {
  servers: McpServer[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onDone: () => void
}) {
  const [cursor, setCursor] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setCursor((prev) => Math.min(servers.length, prev + 1))
    } else if (input === " " && cursor < servers.length) {
      onToggle(servers[cursor].id)
    } else if (key.return) {
      onDone()
    }
  })

  if (servers.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No MCP servers available to attach.</Text>
        <Box marginTop={1}>
          <Text dimColor>Press Enter to continue...</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Select MCP servers (Space to toggle, Enter when done):
      </Text>
      <Box marginTop={1} flexDirection="column">
        {servers.map((server, index) => {
          const isSelected = selectedIds.includes(server.id)
          const isCursor = cursor === index
          return (
            <Box key={server.id}>
              <Text color={isCursor ? "cyan" : undefined}>
                {isCursor ? ">" : " "} [{isSelected ? "x" : " "}]{" "}
              </Text>
              <Text>{server.name}</Text>
              <Text dimColor> ({server.transport})</Text>
            </Box>
          )
        })}
        <Box marginTop={1}>
          <Text color={cursor === servers.length ? "cyan" : undefined}>
            {cursor === servers.length ? ">" : " "} [Done - Press Enter]
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

type CreateStep = "name" | "slug" | "servers" | "confirm"

export interface EndpointCreateProps {
  name?: string
  slug?: string
  namespace?: string
}

export function EndpointCreate(props: EndpointCreateProps) {
  const { exit } = useApp()
  const [status, setStatus] = useState<
    "input" | "loading-servers" | "creating" | "success" | "error"
  >("input")
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [createdEndpoint, setCreatedEndpoint] = useState<Endpoint | null>(null)

  const [name, setName] = useState(props.name ?? "")
  const [slug, setSlug] = useState(props.slug ?? "")
  const [namespaceId] = useState(props.namespace ?? "")
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [availableServers, setAvailableServers] = useState<McpServer[]>([])

  const isInteractive = !props.name
  const [step, setStep] = useState<CreateStep>("name")

  const hasRequiredFromProps = useCallback(() => {
    return !!props.name && !!props.slug
  }, [props.name, props.slug])

  const loadServers = useCallback(async () => {
    setStatus("loading-servers")
    try {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        throw new Error(
          "No organization selected. Run: athreei org switch <name>"
        )
      }

      const client = getApiClient()
      const params = new URLSearchParams({
        organizationId: orgId,
        limit: "50",
      })
      const data = await client.get<McpServerListResponse>(
        `/api/mcp-servers?${params.toString()}`
      )
      setAvailableServers(data.data)
      setStatus("input")
      setStep("servers")
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load MCP servers")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [exit])

  const submitForm = useCallback(async () => {
    if (!name.trim()) {
      setError(new Error("Name is required"))
      setStatus("error")
      setTimeout(() => exit(), 100)
      return
    }

    const finalSlug = slug.trim() || generateSlug(name)

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
      const payload: CreateEndpointRequest = {
        name: name.trim(),
        slug: finalSlug,
        organizationId: orgId,
      }

      if (namespaceId) {
        payload.namespaceId = namespaceId
      }

      if (selectedServerIds.length > 0) {
        payload.mcpServerIds = selectedServerIds
      }

      const response = await client.post<CreateEndpointResponse>(
        "/api/endpoints",
        payload
      )

      setCreatedEndpoint(response.data)
      setStatus("success")
      setTimeout(() => exit(), 100)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to create endpoint")
      )
      setStatus("error")
      setTimeout(() => exit(), 100)
    }
  }, [name, slug, namespaceId, selectedServerIds, exit])

  useEffect(() => {
    if (hasRequiredFromProps() && status === "input") {
      submitForm()
    }
  }, [hasRequiredFromProps, submitForm, status])

  const nextStep = useCallback(() => {
    switch (step) {
      case "name":
        if (!name.trim()) return
        if (!slug) {
          setSlug(generateSlug(name))
        }
        setStep("slug")
        break
      case "slug":
        loadServers()
        break
      case "servers":
        setStep("confirm")
        break
      case "confirm":
        submitForm()
        break
    }
  }, [step, name, slug, loadServers, submitForm])

  const toggleServer = useCallback((serverId: string) => {
    setSelectedServerIds((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    )
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

  const confirmOptions = [
    { label: "Yes, create endpoint", value: "yes" },
    { label: "No, cancel", value: "no" },
  ]

  if (status === "loading-servers") {
    return <LoadingSpinner message="Loading available MCP servers..." />
  }

  if (status === "creating") {
    return <LoadingSpinner message="Creating endpoint..." />
  }

  if (status === "success" && createdEndpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">Endpoint created successfully</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>ID: </Text>
          <Text color="cyan">{createdEndpoint.id}</Text>
        </Box>
        <Box>
          <Text dimColor>Name: </Text>
          <Text>{createdEndpoint.name}</Text>
        </Box>
        <Box>
          <Text dimColor>Slug: </Text>
          <Text>{createdEndpoint.slug}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={getStatusColor(createdEndpoint.status)}>
            {createdEndpoint.status}
          </Text>
        </Box>
        {createdEndpoint.mcpServers &&
          createdEndpoint.mcpServers.length > 0 && (
            <Box marginTop={1}>
              <Text dimColor>MCP Servers: </Text>
              <Text>{createdEndpoint.mcpServers.length} attached</Text>
            </Box>
          )}
      </Box>
    )
  }

  if (status === "error" && error) {
    return <ErrorDisplay error={error} context="creating endpoint" />
  }

  if (isInteractive) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Create Endpoint
          </Text>
        </Box>

        {step === "name" && (
          <TextInputField
            label="Name"
            value={name}
            onChange={setName}
            onSubmit={nextStep}
            placeholder="Enter endpoint name"
          />
        )}

        {step === "slug" && (
          <>
            <Box marginBottom={1}>
              <Text dimColor>Name: {name}</Text>
            </Box>
            <TextInputField
              label="Slug"
              value={slug}
              onChange={setSlug}
              onSubmit={nextStep}
              placeholder={generateSlug(name) || "Enter slug"}
            />
          </>
        )}

        {step === "servers" && (
          <ServerSelector
            servers={availableServers}
            selectedIds={selectedServerIds}
            onToggle={toggleServer}
            onDone={nextStep}
          />
        )}

        {step === "confirm" && (
          <>
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Review:</Text>
              <Box marginLeft={2}>
                <Text dimColor>Name: </Text>
                <Text>{name}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text dimColor>Slug: </Text>
                <Text>{slug || generateSlug(name)}</Text>
              </Box>
              {namespaceId && (
                <Box marginLeft={2}>
                  <Text dimColor>Namespace: </Text>
                  <Text>{namespaceId}</Text>
                </Box>
              )}
              <Box marginLeft={2}>
                <Text dimColor>MCP Servers: </Text>
                <Text>{selectedServerIds.length} selected</Text>
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text color="cyan">Create this endpoint? </Text>
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
