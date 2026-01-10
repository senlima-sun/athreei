import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { loadConfig } from "../../lib/config-loader.js"
import {
  compareConfigs,
  generateDiffLines,
  toJsonDiff,
  type SyncDiffResult,
  type DiffLine,
} from "../../lib/sync-utils.js"
import type { McpServer } from "../../lib/types.js"

interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

type DiffPhase = "loading" | "comparing" | "complete" | "error"

export interface SyncDiffProps {
  json?: boolean
}

export function SyncDiff(props: SyncDiffProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<DiffPhase>("loading")
  const [diff, setDiff] = useState<SyncDiffResult | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function loadAndCompare() {
      try {
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const localServers = localResult.config.mcpServers ?? []

        const store = createCredentialStore()
        const orgId = await store.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setPhase("comparing")

        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        const cloudServers = cloudResponse.data

        const result = compareConfigs(localServers, cloudServers)
        setDiff(result)
        setPhase("complete")
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to diff"))
        setPhase("error")
        process.exitCode = 1
      }

      setTimeout(() => exit(), 100)
    }

    loadAndCompare()
  }, [exit])

  if (phase === "loading" || phase === "comparing") {
    return (
      <LoadingSpinner
        message={
          phase === "loading"
            ? "Loading configurations..."
            : "Comparing configurations..."
        }
      />
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="comparing configurations" />
  }

  if (phase === "complete" && diff) {
    if (props.json) {
      console.log(JSON.stringify(toJsonDiff(diff), null, 2))
      return null
    }

    const lines = generateDiffLines(diff)

    if (lines.length === 0) {
      return (
        <Box padding={1}>
          <Text color="green">
            No MCP servers configured locally or in cloud
          </Text>
        </Box>
      )
    }

    const getLineColor = (type: DiffLine["type"]): string => {
      switch (type) {
        case "add":
          return "green"
        case "remove":
          return "red"
        case "modify":
          return "yellow"
        default:
          return "white"
      }
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Sync Diff: Local vs Cloud
          </Text>
        </Box>

        {lines.map((line, index) => (
          <Box key={index}>
            <Text color={getLineColor(line.type)}>{line.text}</Text>
          </Box>
        ))}

        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Legend:</Text>
          <Box marginLeft={2}>
            <Text color="green">+ </Text>
            <Text dimColor>local only (push to add to cloud)</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="red">- </Text>
            <Text dimColor>cloud only (pull to add locally)</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="yellow">~ </Text>
            <Text dimColor>conflict (different configurations)</Text>
          </Box>
        </Box>
      </Box>
    )
  }

  return null
}
