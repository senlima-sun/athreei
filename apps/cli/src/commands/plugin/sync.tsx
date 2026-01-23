import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { getApiClient, ApiError } from "../../lib/api"
import { createCredentialStore } from "../../auth/credentials"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"

export interface PluginSyncProps {
  json?: boolean
  dryRun?: boolean
}

interface Installation {
  id: string
  plugin: {
    id: string
    slug: string
    name: string
    marketplace: { slug: string }
  }
  version: {
    version: string
    manifest: string
  }
}

interface SyncResult {
  added: string[]
  updated: string[]
  removed: string[]
  errors: string[]
}

function getClaudeConfigPath(): string {
  const platform = os.platform()
  if (platform === "darwin") {
    return path.join(os.homedir(), ".claude")
  } else if (platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), "Claude")
  }
  return path.join(os.homedir(), ".config", "claude")
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function PluginSync(props: PluginSyncProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    async function sync() {
      const syncResult: SyncResult = {
        added: [],
        updated: [],
        removed: [],
        errors: [],
      }

      try {
        const client = getApiClient()
        const credStore = createCredentialStore()
        const orgId = await credStore.getActiveOrg()

        if (!orgId) {
          throw new Error(
            "No active organization. Run 'athreei org switch' first."
          )
        }

        const data = await client.get<{ installations: Installation[] }>(
          `/api/organizations/${orgId}/plugins`
        )

        const installations = data.installations || []
        const claudeConfigPath = getClaudeConfigPath()
        const pluginsDir = path.join(claudeConfigPath, "plugins")

        if (!props.dryRun) {
          ensureDir(pluginsDir)
        }

        const existingPlugins = new Set<string>()
        if (fs.existsSync(pluginsDir)) {
          const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
          for (const dir of dirs) {
            if (dir.isDirectory()) {
              existingPlugins.add(dir.name)
            }
          }
        }

        const activePluginSlugs = new Set<string>()

        for (const installation of installations) {
          const pluginSlug = `${installation.plugin.marketplace.slug}__${installation.plugin.slug}`
          activePluginSlugs.add(pluginSlug)

          const pluginDir = path.join(pluginsDir, pluginSlug)
          const manifestPath = path.join(
            pluginDir,
            ".claude-plugin",
            "plugin.json"
          )

          let manifest: Record<string, unknown> = {}
          try {
            manifest = JSON.parse(installation.version.manifest || "{}")
          } catch {
            syncResult.errors.push(`Failed to parse manifest for ${pluginSlug}`)
            continue
          }

          if (existingPlugins.has(pluginSlug)) {
            const existingManifestPath = manifestPath
            if (fs.existsSync(existingManifestPath)) {
              try {
                const existingManifest = JSON.parse(
                  fs.readFileSync(existingManifestPath, "utf-8")
                )
                if (existingManifest.version !== manifest.version) {
                  if (!props.dryRun) {
                    ensureDir(path.dirname(manifestPath))
                    fs.writeFileSync(
                      manifestPath,
                      JSON.stringify(manifest, null, 2)
                    )
                  }
                  syncResult.updated.push(pluginSlug)
                }
              } catch {
                syncResult.errors.push(
                  `Failed to read existing manifest for ${pluginSlug}`
                )
              }
            }
          } else {
            if (!props.dryRun) {
              ensureDir(path.dirname(manifestPath))
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
            }
            syncResult.added.push(pluginSlug)
          }
        }

        for (const existingSlug of existingPlugins) {
          if (!activePluginSlugs.has(existingSlug)) {
            if (!props.dryRun) {
              const pluginDir = path.join(pluginsDir, existingSlug)
              fs.rmSync(pluginDir, { recursive: true, force: true })
            }
            syncResult.removed.push(existingSlug)
          }
        }

        setResult(syncResult)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Sync failed"))
      }
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    sync()
  }, [exit, props.dryRun])

  if (loading) return <LoadingSpinner message="Syncing plugins..." />
  if (error) return <ErrorDisplay error={error} context="syncing plugins" />

  if (props.json) {
    console.log(JSON.stringify(result, null, 2))
    return null
  }

  const totalChanges =
    (result?.added.length || 0) +
    (result?.updated.length || 0) +
    (result?.removed.length || 0)

  return (
    <Box flexDirection="column" padding={1}>
      {props.dryRun && (
        <Text color="yellow" bold>
          [DRY RUN] No changes made.
        </Text>
      )}
      <Text color="green">
        ✓ Plugin sync {props.dryRun ? "preview" : "complete"}!
      </Text>
      <Box marginTop={1} flexDirection="column">
        {result?.added.length ? (
          <Text>
            <Text color="green">Added:</Text> {result.added.join(", ")}
          </Text>
        ) : null}
        {result?.updated.length ? (
          <Text>
            <Text color="blue">Updated:</Text> {result.updated.join(", ")}
          </Text>
        ) : null}
        {result?.removed.length ? (
          <Text>
            <Text color="red">Removed:</Text> {result.removed.join(", ")}
          </Text>
        ) : null}
        {result?.errors.length ? (
          <Text color="red">
            <Text bold>Errors:</Text> {result.errors.join("; ")}
          </Text>
        ) : null}
        {totalChanges === 0 && !result?.errors.length && (
          <Text color="gray">No changes needed.</Text>
        )}
      </Box>
    </Box>
  )
}
