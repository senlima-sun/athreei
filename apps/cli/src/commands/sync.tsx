import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"
import { loadConfig, writeConfig } from "../lib/config-loader.js"
import type { Config } from "../lib/config-schema.js"
import type { McpServer } from "../lib/types.js"
import {
  compareConfigs,
  mergeMcpServers,
  localToCloudRequest,
  generateDiffLines,
  toJsonDiff,
  type SyncDiffResult,
  type ServerComparison,
  type ConflictResolution,
  type DiffLine,
} from "../lib/sync-utils.js"

// ============================================
// API Response Types
// ============================================

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

// ============================================
// SyncStatus - Compare local and cloud configs
// ============================================

type StatusPhase = "loading" | "comparing" | "complete" | "error"

interface SyncStatusProps {
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
        // Load local config
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const localServers = localResult.config.mcpServers ?? []

        // Get active organization
        const store = createCredentialStore()
        const orgId = await store.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setPhase("comparing")

        // Fetch cloud servers
        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        const cloudServers = cloudResponse.data

        // Compare configurations
        const result = compareConfigs(localServers, cloudServers)
        setDiff(result)
        setPhase("complete")

        // Set exit code based on sync status
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
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text>
          {" "}
          {phase === "loading"
            ? "Loading configurations..."
            : "Comparing configurations..."}
        </Text>
      </Box>
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

    // JSON output mode
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

// ============================================
// SyncDiff - Show detailed differences
// ============================================

interface SyncDiffProps {
  json?: boolean
}

type DiffPhase = "loading" | "comparing" | "complete" | "error"

export function SyncDiff(props: SyncDiffProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<DiffPhase>("loading")
  const [diff, setDiff] = useState<SyncDiffResult | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function loadAndCompare() {
      try {
        // Load local config
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const localServers = localResult.config.mcpServers ?? []

        // Get active organization
        const store = createCredentialStore()
        const orgId = await store.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setPhase("comparing")

        // Fetch cloud servers
        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        const cloudServers = cloudResponse.data

        // Compare configurations
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
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text>
          {" "}
          {phase === "loading"
            ? "Loading configurations..."
            : "Comparing configurations..."}
        </Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="comparing configurations" />
  }

  if (phase === "complete" && diff) {
    // JSON output mode
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

// ============================================
// SyncPull - Pull cloud config to local
// ============================================

interface SyncPullProps {
  yes?: boolean
}

type PullPhase =
  | "loading"
  | "comparing"
  | "showing-diff"
  | "resolving-conflicts"
  | "applying"
  | "success"
  | "cancelled"
  | "error"

interface ConflictState {
  conflicts: ServerComparison[]
  currentIndex: number
  resolutions: Map<string, ConflictResolution>
}

export function SyncPull(props: SyncPullProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<PullPhase>("loading")
  const [diff, setDiff] = useState<SyncDiffResult | null>(null)
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [cloudServers, setCloudServers] = useState<McpServer[]>([])
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [conflictState, setConflictState] = useState<ConflictState | null>(null)
  const [result, setResult] = useState<{
    added: string[]
    updated: string[]
    skipped: string[]
  } | null>(null)

  // Load and compare configurations
  useEffect(() => {
    async function loadAndCompare() {
      try {
        // Load local config
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        setConfig(localResult.config)
        setConfigPath(localResult.path)

        const localServers = localResult.config.mcpServers ?? []

        // Get active organization
        const store = createCredentialStore()
        const orgId = await store.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setPhase("comparing")

        // Fetch cloud servers
        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: orgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        setCloudServers(cloudResponse.data)

        // Compare configurations
        const diffResult = compareConfigs(localServers, cloudResponse.data)
        setDiff(diffResult)

        // Check if there are any changes to pull
        if (
          diffResult.cloudOnly.length === 0 &&
          diffResult.conflicts.length === 0
        ) {
          setResult({ added: [], updated: [], skipped: [] })
          setPhase("success")
          setTimeout(() => exit(), 100)
          return
        }

        if (props.yes) {
          // Skip confirmation, use cloud for all conflicts
          setPhase("applying")
        } else {
          setPhase("showing-diff")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to pull from cloud")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    loadAndCompare()
  }, [exit, props.yes])

  // Apply changes
  useEffect(() => {
    if (phase !== "applying" || !config || !configPath || !diff) return

    async function applyChanges() {
      try {
        const resolutions = conflictState?.resolutions ?? new Map()

        const mergeResult = await mergeMcpServers(
          config!.mcpServers ?? [],
          cloudServers,
          {
            resolveConflict: async (comparison) => {
              return resolutions.get(comparison.name) ?? "use-cloud"
            },
          }
        )

        // Update config
        const updatedConfig: Config = {
          ...config!,
          mcpServers: mergeResult.result,
        }

        writeConfig(updatedConfig, configPath!)
        setResult({
          added: mergeResult.added,
          updated: mergeResult.updated,
          skipped: mergeResult.skipped,
        })
        setPhase("success")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to apply changes")
        )
        setPhase("error")
      }
      setTimeout(() => exit(), 100)
    }

    applyChanges()
  }, [phase, config, configPath, diff, cloudServers, conflictState, exit])

  // Handle keyboard input for confirmation
  useInput(
    (input, key) => {
      if (phase !== "showing-diff") return

      if (input.toLowerCase() === "y" || key.return) {
        if (diff && diff.conflicts.length > 0) {
          setConflictState({
            conflicts: diff.conflicts,
            currentIndex: 0,
            resolutions: new Map(),
          })
          setPhase("resolving-conflicts")
        } else {
          setPhase("applying")
        }
      } else if (input.toLowerCase() === "n" || key.escape) {
        setPhase("cancelled")
        setTimeout(() => exit(), 100)
      }
    },
    { isActive: phase === "showing-diff" }
  )

  // Handle conflict resolution selection
  const handleConflictSelect = useCallback(
    (item: { value: string }) => {
      if (!conflictState) return

      const resolution = item.value as ConflictResolution
      const currentConflict =
        conflictState.conflicts[conflictState.currentIndex]

      const newResolutions = new Map(conflictState.resolutions)
      newResolutions.set(currentConflict.name, resolution)

      if (conflictState.currentIndex < conflictState.conflicts.length - 1) {
        setConflictState({
          ...conflictState,
          currentIndex: conflictState.currentIndex + 1,
          resolutions: newResolutions,
        })
      } else {
        setConflictState({
          ...conflictState,
          resolutions: newResolutions,
        })
        setPhase("applying")
      }
    },
    [conflictState]
  )

  const conflictOptions = [
    { label: "Keep local configuration", value: "keep-local" },
    { label: "Use cloud configuration", value: "use-cloud" },
    { label: "Skip (keep local)", value: "skip" },
  ]

  if (phase === "loading" || phase === "comparing") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text>
          {" "}
          {phase === "loading"
            ? "Loading configurations..."
            : "Comparing configurations..."}
        </Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="pulling from cloud" />
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
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Pull from Cloud
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Changes to apply:</Text>

          {diff.cloudOnly.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              <Text color="green">
                Add {diff.cloudOnly.length} server(s) from cloud:
              </Text>
              {diff.cloudOnly.map((item) => (
                <Box key={item.name} marginLeft={2}>
                  <Text color="green">+ {item.name}</Text>
                </Box>
              ))}
            </Box>
          )}

          {diff.conflicts.length > 0 && (
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="yellow">
                {diff.conflicts.length} conflict(s) to resolve:
              </Text>
              {diff.conflicts.map((item) => (
                <Box key={item.name} marginLeft={2}>
                  <Text color="yellow">~ {item.name}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box marginTop={1}>
          <Text>Apply changes? </Text>
          <Text color="yellow">[Y/n]</Text>
        </Box>
      </Box>
    )
  }

  if (phase === "resolving-conflicts" && conflictState) {
    const currentConflict = conflictState.conflicts[conflictState.currentIndex]

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="yellow">
            Resolve Conflict ({conflictState.currentIndex + 1}/
            {conflictState.conflicts.length})
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold>{currentConflict.name}</Text>

          {currentConflict.differences?.map((diff, index) => (
            <Box key={index} marginLeft={2}>
              <Text dimColor>{diff}</Text>
            </Box>
          ))}
        </Box>

        <SelectInput items={conflictOptions} onSelect={handleConflictSelect} />
      </Box>
    )
  }

  if (phase === "applying") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Applying changes...</Text>
      </Box>
    )
  }

  if (phase === "success" && result) {
    const hasChanges =
      result.added.length > 0 ||
      result.updated.length > 0 ||
      result.skipped.length > 0

    if (!hasChanges) {
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
          <Text color="green">Pull complete</Text>
        </Box>

        {result.added.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="green">Added ({result.added.length}):</Text>
            {result.added.map((name) => (
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

        {result.skipped.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            <Text dimColor>Skipped ({result.skipped.length}):</Text>
            {result.skipped.map((name) => (
              <Box key={name} marginLeft={2}>
                <Text dimColor>- {name}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  return null
}

// ============================================
// SyncPush - Push local config to cloud
// ============================================

interface SyncPushProps {
  yes?: boolean
  delete?: boolean
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

export function SyncPush(props: SyncPushProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<PushPhase>("loading")
  const [diff, setDiff] = useState<SyncDiffResult | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [cloudServers, setCloudServers] = useState<McpServer[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)
  const [result, setResult] = useState<PushResult | null>(null)

  // Load and compare configurations
  useEffect(() => {
    async function loadAndCompare() {
      try {
        // Load local config
        const localResult = loadConfig()
        if (!localResult) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        setConfig(localResult.config)

        const localServers = localResult.config.mcpServers ?? []

        // Get active organization
        const store = createCredentialStore()
        const activeOrgId = await store.getActiveOrg()

        if (!activeOrgId) {
          throw new Error(
            "No organization selected. Run: athreei org switch <name>"
          )
        }

        setOrgId(activeOrgId)
        setPhase("comparing")

        // Fetch cloud servers
        const client = getApiClient()
        const params = new URLSearchParams({
          organizationId: activeOrgId,
          limit: "100",
        })
        const cloudResponse = await client.get<McpServerListResponse>(
          `/api/mcp-servers?${params.toString()}`
        )
        setCloudServers(cloudResponse.data)

        // Compare configurations
        const diffResult = compareConfigs(localServers, cloudResponse.data)
        setDiff(diffResult)

        // Check if there are any changes to push
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

  // Push changes
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

        // Create cloud-only to local name mapping for updates
        const cloudByName = new Map<string, McpServer>()
        for (const server of cloudServers) {
          cloudByName.set(server.name.toLowerCase(), server)
        }

        // Create new servers (local-only)
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

        // Update conflicting servers (use local values)
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

        // Delete cloud-only servers if --delete flag is set
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

  // Handle keyboard input for confirmation
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
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text>
          {" "}
          {phase === "loading"
            ? "Loading configurations..."
            : "Comparing configurations..."}
        </Text>
      </Box>
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
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Pushing changes to cloud...</Text>
      </Box>
    )
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
            {result.failed.map(({ name, error }) => (
              <Box key={name} flexDirection="column" marginLeft={2}>
                <Text color="red">x {name}</Text>
                <Box marginLeft={2}>
                  <Text dimColor>{error}</Text>
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
