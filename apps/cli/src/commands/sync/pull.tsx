import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import { getApiClient, ApiError } from "../../lib/api.js"
import { createCredentialStore } from "../../auth/credentials.js"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { loadConfig, writeConfig } from "../../lib/config-loader.js"
import type { Config } from "../../lib/config-schema.js"
import type { McpServer } from "../../lib/types.js"
import {
  compareConfigs,
  mergeMcpServers,
  type SyncDiffResult,
  type ServerComparison,
  type ConflictResolution,
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

export interface SyncPullProps {
  yes?: boolean
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
        setConfigPath(localResult.path)

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
        setCloudServers(cloudResponse.data)

        const diffResult = compareConfigs(localServers, cloudResponse.data)
        setDiff(diffResult)

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

          {currentConflict.differences?.map((diffItem, index) => (
            <Box key={index} marginLeft={2}>
              <Text dimColor>{diffItem}</Text>
            </Box>
          ))}
        </Box>

        <SelectInput items={conflictOptions} onSelect={handleConflictSelect} />
      </Box>
    )
  }

  if (phase === "applying") {
    return <LoadingSpinner message="Applying changes..." />
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
