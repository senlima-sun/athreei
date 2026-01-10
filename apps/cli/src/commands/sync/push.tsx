import React, { useState, useEffect } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { loadConfig } from "../../lib/config-loader.js"
import type { Config } from "../../lib/config-schema.js"
import type { McpServer } from "../../lib/types.js"
import {
  compareConfigs,
  localToCloudRequest,
  type SyncDiffResult,
} from "../../lib/sync-utils.js"

interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface McpServerResponse {
  data: McpServer
}

type PushPhase =
  | "loading"
  | "comparing"
  | "showing-diff"
  | "pushing"
  | "success"
  | "cancelled"
  | "error"

interface PushResult {
  created: string[]
  updated: string[]
  deleted: string[]
  failed: Array<{ name: string; error: string }>
}

export interface SyncPushProps {
  yes?: boolean
  delete?: boolean
}

export function SyncPush(props: SyncPushProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<PushPhase>("loading")
  const [diff, setDiff] = useState<SyncDiffResult | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [cloudServers, setCloudServers] = useState<McpServer[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [result, setResult] = useState<PushResult | null>(null)

  useEffect(() => {
    async function loadAndCompare() {
      try {
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        setConfig(localResult.config)

        const localServers = localResult.config.mcpServers ?? []

        const store = createCredentialStore()
        const activeOrgId = await store.getActiveOrg()

        if (!activeOrgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setOrgId(activeOrgId)
        setPhase("comparing")

        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: activeOrgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        setCloudServers(cloudResponse.data)

        const diffResult = compareConfigs(localServers, cloudResponse.data)
        setDiff(diffResult)

        const hasChanges =
          diffResult.localOnly.length > 0 ||
          diffResult.conflicts.length > 0 ||
          (props.delete && diffResult.cloudOnly.length > 0)

        if (!hasChanges) {
          setResult({ created: [], updated: [], deleted: [], failed: [] })
          setPhase("success")
          setTimeout(() => exit(), 100)
          return
        }

        if (props.yes) {
          setPhase("pushing")
        } else {
          setPhase("showing-diff")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to push to cloud")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    loadAndCompare()
  }, [exit, props.yes, props.delete])

  useEffect(() => {
    if (phase !== "pushing" || !config || !diff || !orgId) return

    async function pushChanges() {
      const pushResult: PushResult = {
        created: [],
        updated: [],
        deleted: [],
        failed: [],
      }

      try {
        const client = getApiClient()

        const cloudByName = new Map<string, McpServer>()
        for (const server of cloudServers) {
          cloudByName.set(server.name.toLowerCase(), server)
        }

        for (const comparison of diff!.localOnly) {
          try {
            const payload = localToCloudRequest(comparison.local!, orgId!)
            await client.post<McpServerResponse>("/api/mcp-servers", payload)
            pushResult.created.push(comparison.name)
          } catch (err) {
            pushResult.failed.push({
              name: comparison.name,
              error: err instanceof Error ? err.message : "Unknown error",
            })
          }
        }

        for (const comparison of diff!.conflicts) {
          try {
            const cloudServer = cloudByName.get(comparison.name.toLowerCase())
            if (cloudServer) {
              const payload = localToCloudRequest(comparison.local!, orgId!)
              await client.patch<McpServerResponse>(
                `/api/mcp-servers/${cloudServer.id}`,
                payload
              )
              pushResult.updated.push(comparison.name)
            }
          } catch (err) {
            pushResult.failed.push({
              name: comparison.name,
              error: err instanceof Error ? err.message : "Unknown error",
            })
          }
        }

        if (props.delete) {
          for (const comparison of diff!.cloudOnly) {
            try {
              await client.delete(`/api/mcp-servers/${comparison.cloud!.id}`)
              pushResult.deleted.push(comparison.name)
            } catch (err) {
              pushResult.failed.push({
                name: comparison.name,
                error: err instanceof Error ? err.message : "Unknown error",
              })
            }
          }
        }

        setResult(pushResult)
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to push changes")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    pushChanges()
  }, [phase, config, diff, orgId, cloudServers, props.delete, exit])

  useInput(
    (input, key) => {
      if (phase !== "showing-diff") return

      if (input.toLowerCase() === "y" || key.return) {
        setPhase("pushing")
      } else if (input.toLowerCase() === "n" || key.escape) {
        setPhase("cancelled")
        setTimeout(() => exit(), 100)
      }
    },
    { isActive: phase === "showing-diff" }
  )

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
    return <ErrorDisplay error={error} context="pushing to cloud" />
  }

  if (phase === "cancelled") {
    return (
      <Box padding={1}>
        <Text color="yellow">Cancelled. </Text>
        <Text dimColor>No changes made.</Text>
      </Box>
    )
  }

  if (phase === "showing-diff" && diff) {
    const hasDeletes = props.delete && diff.cloudOnly.length > 0

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Push to Cloud
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Changes to apply:</Text>

          {diff.localOnly.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              <Text color="green">
                Create {diff.localOnly.length} server(s) in cloud:
              </Text>
              {diff.localOnly.map((item) => (
                <Box key={item.name} marginLeft={2}>
                  <Text color="green">+ {item.name}</Text>
                </Box>
              ))}
            </Box>
          )}

          {diff.conflicts.length > 0 && (
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="yellow">
                Update {diff.conflicts.length} server(s) in cloud (use local
                config):
              </Text>
              {diff.conflicts.map((item) => (
                <Box key={item.name} marginLeft={2}>
                  <Text color="yellow">~ {item.name}</Text>
                </Box>
              ))}
            </Box>
          )}

          {hasDeletes && (
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="red">
                Delete {diff.cloudOnly.length} server(s) from cloud:
              </Text>
              {diff.cloudOnly.map((item) => (
                <Box key={item.name} marginLeft={2}>
                  <Text color="red">- {item.name}</Text>
                </Box>
              ))}
            </Box>
          )}

          {!props.delete && diff.cloudOnly.length > 0 && (
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text dimColor>
                {diff.cloudOnly.length} cloud-only server(s) will be kept (use
                --delete to remove)
              </Text>
            </Box>
          )}
        </Box>

        {hasDeletes && (
          <Box marginBottom={1}>
            <Text color="red" bold>
              Warning: --delete will permanently remove servers from cloud!
            </Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text>Apply changes? </Text>
          <Text color="yellow">[Y/n]</Text>
        </Box>
      </Box>
    )
  }

  if (phase === "pushing") {
    return <LoadingSpinner message="Pushing changes to cloud..." />
  }

  if (phase === "success" && result) {
    const hasChanges =
      result.created.length > 0 ||
      result.updated.length > 0 ||
      result.deleted.length > 0

    if (!hasChanges && result.failed.length === 0) {
      return (
        <Box padding={1}>
          <Text color="green">Already in sync. </Text>
          <Text dimColor>No changes needed.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color={result.failed.length > 0 ? "yellow" : "green"}>
            {result.failed.length > 0
              ? "Push completed with errors"
              : "Push complete"}
          </Text>
        </Box>

        {result.created.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="green">Created ({result.created.length}):</Text>
            {result.created.map((name) => (
              <Box key={name} marginLeft={2}>
                <Text color="green">+ {name}</Text>
              </Box>
            ))}
          </Box>
        )}

        {result.updated.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="yellow">Updated ({result.updated.length}):</Text>
            {result.updated.map((name) => (
              <Box key={name} marginLeft={2}>
                <Text color="yellow">~ {name}</Text>
              </Box>
            ))}
          </Box>
        )}

        {result.deleted.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="red">Deleted ({result.deleted.length}):</Text>
            {result.deleted.map((name) => (
              <Box key={name} marginLeft={2}>
                <Text color="red">- {name}</Text>
              </Box>
            ))}
          </Box>
        )}

        {result.failed.length > 0 && (
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            <Text color="red">Failed ({result.failed.length}):</Text>
            {result.failed.map(({ name, error: errMsg }) => (
              <Box key={name} flexDirection="column" marginLeft={2}>
                <Text color="red">x {name}</Text>
                <Box marginLeft={2}>
                  <Text dimColor>{errMsg}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  return null
}
