import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import type { McpServer } from "../../types/api.js"
import { getMode } from "../../index.js"
import { listLocalServers } from "../../lib/local-config.js"
import type { ServerConfig } from "@athreei/shared"
import type { McpServerListResponse } from "./types.js"

export interface McpListProps {
  search?: string
  status?: string
  transport?: string
  json?: boolean
}

export function McpList(props: McpListProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState<McpServer[]>([])
  const [localServers, setLocalServers] = useState<ServerConfig[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)
  const mode = getMode()

  useEffect(() => {
    async function load() {
      if (mode === "local") {
        try {
          let servers = listLocalServers()

          if (props.search) {
            const query = props.search.toLowerCase()
            servers = servers.filter((s) =>
              s.name.toLowerCase().includes(query)
            )
          }
          if (props.transport) {
            servers = servers.filter(
              (s) => (s.transport ?? "stdio") === props.transport
            )
          }

          setLocalServers(servers)
        } catch (err) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to load local config")
          )
        }
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        setError(
          new Error("No organization selected. Run: athreei org switch <name>")
        )
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "50",
        })
        if (props.search) params.append("search", props.search)
        if (props.status) params.append("status", props.status)
        if (props.transport) params.append("transport", props.transport)

        const client = getApiClient()
        const data = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        setServers(data.data)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch MCP servers")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.search, props.status, props.transport, mode])

  if (loading) {
    return <LoadingSpinner message="Loading MCP servers..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="fetching MCP servers" />
  }

  if (props.json) {
    const data = mode === "local" ? { servers: localServers } : { servers }
    console.log(JSON.stringify(data, null, 2))
    return null
  }

  if (mode === "local") {
    if (localServers.length === 0) {
      return (
        <Box padding={1}>
          <Text color="yellow">No MCP servers found in local config</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            MCP Servers [local] ({localServers.length})
          </Text>
        </Box>
        {localServers.map((server) => (
          <Box key={server.name} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold>{server.name}</Text>
            </Box>
            <Box marginLeft={2}>
              <Text dimColor>Transport: {server.transport ?? "stdio"}</Text>
            </Box>
            {server.command && (
              <Box marginLeft={2}>
                <Text dimColor>
                  Command: {server.command}
                  {server.args ? ` ${server.args.join(" ")}` : ""}
                </Text>
              </Box>
            )}
            {server.url && (
              <Box marginLeft={2}>
                <Text dimColor>URL: {server.url}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    )
  }

  if (servers.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No MCP servers found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          MCP Servers ({servers.length})
        </Text>
      </Box>
      {servers.map((server) => (
        <Box key={server.id} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold>{server.name}</Text>
            <Text dimColor> ({server.status})</Text>
          </Box>
          {server.description && (
            <Box marginLeft={2}>
              <Text dimColor>{server.description}</Text>
            </Box>
          )}
          <Box marginLeft={2}>
            <Text dimColor>Transport: {server.transport}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
