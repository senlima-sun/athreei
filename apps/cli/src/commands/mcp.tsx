import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import { getAuthManager } from "../auth/manager.js"
import { createCredentialStore } from "../auth/credentials.js"

const API_URL = process.env.ATHREEI_API_URL || "http://localhost:3001"

interface McpServer {
  id: string
  name: string
  description: string | null
  transport: "stdio" | "sse" | "streamable-http"
  status: "active" | "inactive" | "pending"
  lastSeenAt: string | null
}

interface ListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export function McpList(props: {
  search?: string
  status?: string
  transport?: string
}) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState<McpServer[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const manager = getAuthManager()
      const store = createCredentialStore()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated. Run: athreei auth login")
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      const orgId = await store.getActiveOrg()
      if (!orgId) {
        setError("No organization selected. Run: athreei org switch <name>")
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

        const res = await fetch(
          `${API_URL}/api/mcp-servers?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        )

        if (!res.ok) throw new Error(`API error: ${res.statusText}`)
        const data: ListResponse = await res.json()
        setServers(data.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch MCP servers"
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit, props.search, props.status, props.transport])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading MCP servers...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
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
