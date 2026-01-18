import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { loadConfig } from "../../lib/config-loader"
import { compareConfigs, type SyncDiffResult } from "../../lib/sync-utils"
import type { McpServer } from "../../types/index"

interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

type StatusPhase = "loading" | "comparing" | "complete" | "error"

export interface SyncStatusProps {
  json?: boolean
}

export function SyncStatus(props: SyncStatusProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<StatusPhase>("loading")
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

        if (!result.summary.isInSync) {
          process.exitCode = 1
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to check sync status")
        )
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
    if (props.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
      return null
    }
    return <ErrorDisplay error={error} context="checking sync status" />
  }

  if (phase === "complete" && diff) {
    const { summary } = diff

    if (props.json) {
      console.log(
        JSON.stringify(
          {
            isInSync: summary.isInSync,
            inSyncCount: summary.inSyncCount,
            localOnlyCount: summary.localOnlyCount,
            cloudOnlyCount: summary.cloudOnlyCount,
            conflictCount: summary.conflictCount,
            localOnly: diff.localOnly.map((item) => item.name),
            cloudOnly: diff.cloudOnly.map((item) => item.name),
            conflicts: diff.conflicts.map((item) => item.name),
          },
          null,
          2
        )
      )
      return null
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color={summary.isInSync ? "green" : "yellow"}>
            {summary.isInSync ? "In Sync" : "Out of Sync"}
          </Text>
        </Box>

        <Box flexDirection="column" marginLeft={2}>
          <Box>
            <Text color="green">In sync: </Text>
            <Text>{summary.inSyncCount}</Text>
          </Box>
          <Box>
            <Text color="cyan">Local only: </Text>
            <Text>{summary.localOnlyCount}</Text>
          </Box>
          <Box>
            <Text color="magenta">Cloud only: </Text>
            <Text>{summary.cloudOnlyCount}</Text>
          </Box>
          <Box>
            <Text color="yellow">Conflicts: </Text>
            <Text>{summary.conflictCount}</Text>
          </Box>
        </Box>

        {!summary.isInSync && (
          <Box marginTop={1}>
            <Text dimColor>
              Run &apos;athreei sync diff&apos; for details or &apos;athreei
              sync pull/push&apos; to synchronize
            </Text>
          </Box>
        )}
      </Box>
    )
  }

  return null
}
