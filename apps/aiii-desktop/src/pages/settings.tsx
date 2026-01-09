import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Shield,
  Cloud,
  RefreshCw,
  Key,
  HardDrive,
  ExternalLink,
  Lock,
  CheckCircle,
  Play,
  Square,
  AlertCircle,
  Download,
  Upload,
  Archive,
  Loader2,
} from "lucide-react"
import {
  useVaultLock,
  useMemoryCount,
  useMcpStatus,
  useMcpStart,
  useMcpStop,
  useSyncStatus,
  useSyncNow,
  useSyncPendingCount,
  useExportBackup,
  useImportBackup,
} from "@/hooks"
import { useState } from "react"
import type { ImportStrategy } from "@/lib/api"
import { ErrorDisplay } from "@/components/error-display"
import { ChangePassphraseDialog } from "@/components/change-passphrase-dialog"

export function SettingsPage(): React.ReactElement {
  const vaultLock = useVaultLock()
  const { data: memoryCount = 0 } = useMemoryCount()
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>("skip")
  const [showChangePassphrase, setShowChangePassphrase] = useState(false)

  // MCP server state
  const { data: mcpStatus, isLoading: mcpLoading } = useMcpStatus()
  const mcpStart = useMcpStart()
  const mcpStop = useMcpStop()

  const handleLockVault = async (): Promise<void> => {
    await vaultLock.mutateAsync()
  }

  const handleMcpToggle = async (): Promise<void> => {
    if (mcpStatus?.running) {
      await mcpStop.mutateAsync()
    } else {
      await mcpStart.mutateAsync()
    }
  }

  const mcpError = mcpStart.error || mcpStop.error

  // Sync state
  const { data: syncStatus } = useSyncStatus()
  const { data: pendingCount = 0 } = useSyncPendingCount()
  const syncNow = useSyncNow()

  const handleSyncNow = async (): Promise<void> => {
    await syncNow.mutateAsync()
  }

  // Backup state
  const exportBackup = useExportBackup()
  const importBackup = useImportBackup()
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
    // Use Tauri dialog to get save path
    const { save } = await import("@tauri-apps/plugin-dialog")
    const path = await save({
      defaultPath: `aiii-backup-${new Date().toISOString().split("T")[0]}.aiii`,
      filters: [{ name: "aiii Backup", extensions: ["aiii"] }],
    })

    if (path) {
      const result = await exportBackup.mutateAsync(path)
      setExportSuccess(
        `Exported ${result.spaces_count} spaces and ${result.memories_count} memories`
      )
      setTimeout(() => setExportSuccess(null), 5000)
    }
  }

  const handleImport = async (): Promise<void> => {
    // Use Tauri dialog to get file path
    const { open } = await import("@tauri-apps/plugin-dialog")
    const path = await open({
      multiple: false,
      filters: [{ name: "aiii Backup", extensions: ["aiii"] }],
    })

    if (path && typeof path === "string") {
      const result = await importBackup.mutateAsync({ path, strategy: importStrategy })
      setImportSuccess(
        `Imported ${result.spaces_imported} spaces and ${result.memories_imported} memories`
      )
      setTimeout(() => setImportSuccess(null), 5000)
    }
  }

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Vault / Encryption */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Vault</CardTitle>
                <CardDescription>Your encrypted memory storage</CardDescription>
              </div>
            </div>
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Unlocked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Lock Vault</p>
              <p className="text-xs text-muted-foreground">
                Lock the vault to protect your memories. You&apos;ll need your
                passphrase to unlock.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleLockVault}
              loading={vaultLock.isPending}
            >
              <Lock className="h-4 w-4" />
              Lock Now
            </Button>
          </div>

          {vaultLock.error && <ErrorDisplay error={vaultLock.error} />}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Encryption</p>
              <p className="text-xs text-muted-foreground">
                Your memories are encrypted locally with your passphrase
              </p>
            </div>
            <Badge variant="secondary">
              <Key className="mr-1 h-3 w-3" />
              AES-256-GCM
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Change Passphrase</p>
              <p className="text-xs text-muted-foreground">
                Update your vault passphrase
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassphrase(true)}
            >
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MCP Server */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>MCP Server</CardTitle>
                <CardDescription>
                  Local MCP server for AI app connections
                </CardDescription>
              </div>
            </div>
            {mcpLoading ? (
              <Badge variant="secondary">Loading...</Badge>
            ) : mcpStatus?.running ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Stopped
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Server Control</p>
              <p className="text-xs text-muted-foreground">
                {mcpStatus?.running
                  ? `Running with ${mcpStatus.transport} transport`
                  : "Start the server to allow AI apps to connect"}
              </p>
            </div>
            <Button
              variant={mcpStatus?.running ? "destructive" : "default"}
              size="sm"
              className="gap-2"
              onClick={handleMcpToggle}
              loading={mcpStart.isPending || mcpStop.isPending}
            >
              {mcpStatus?.running ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
          </div>

          {mcpError && <ErrorDisplay error={mcpError} />}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Transport</p>
              <p className="text-xs text-muted-foreground">
                {mcpStatus?.transport === "stdio"
                  ? "stdio - for Claude Desktop"
                  : "HTTP/SSE - for web clients"}
              </p>
            </div>
            <Badge variant="outline">{mcpStatus?.transport ?? "stdio"}</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Setup Guide</p>
              <p className="text-xs text-muted-foreground">
                Learn how to connect Claude Desktop
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Sync</CardTitle>
                <CardDescription>
                  Sync your memories across devices
                </CardDescription>
              </div>
            </div>
            {syncStatus?.enabled ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Cloud Sync</p>
              <p className="text-xs text-muted-foreground">
                {syncStatus?.enabled
                  ? `Last sync: ${formatLastSync(syncStatus.last_sync)}`
                  : "Sync encrypted memories to athreei cloud"}
              </p>
            </div>
            {syncStatus?.enabled ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSyncNow}
                loading={syncNow.isPending}
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            )}
          </div>

          {syncNow.error && <ErrorDisplay error={syncNow.error} />}

          {syncStatus?.enabled && pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p className="text-sm font-medium">Pending Changes</p>
                <p className="text-xs text-muted-foreground">
                  Local changes waiting to sync
                </p>
              </div>
              <Badge variant="secondary">{pendingCount} pending</Badge>
            </div>
          )}

          {syncStatus?.conflicts_count && syncStatus.conflicts_count > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Sync Conflicts
                </p>
                <p className="text-xs text-muted-foreground">
                  {syncStatus.conflicts_count} conflict(s) need resolution
                </p>
              </div>
              <Button variant="outline" size="sm">
                Resolve
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Local Storage</p>
              <p className="text-xs text-muted-foreground">
                SQLite database on your machine
              </p>
            </div>
            <Badge variant="outline">
              <HardDrive className="mr-1 h-3 w-3" />
              {memoryCount} memories
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Export and import your memories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Export Backup</p>
              <p className="text-xs text-muted-foreground">
                Save all your memories to a compressed file
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={exportBackup.isPending}
            >
              {exportBackup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
            </Button>
          </div>

          {exportBackup.error && <ErrorDisplay error={exportBackup.error} />}

          {exportSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {exportSuccess}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Import Backup</p>
              <p className="text-xs text-muted-foreground">
                Restore memories from a backup file
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleImport}
              disabled={importBackup.isPending}
            >
              {importBackup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import
            </Button>
          </div>

          {importBackup.error && <ErrorDisplay error={importBackup.error} />}

          {importSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {importSuccess}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Import Strategy</p>
              <p className="text-xs text-muted-foreground">
                How to handle existing data when importing
              </p>
            </div>
            <select
              value={importStrategy}
              onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
              className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
            >
              <option value="skip">Skip existing</option>
              <option value="merge">Merge (add new only)</option>
              <option value="replace">Replace all</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>
            aiii Desktop - Personal Memory Engine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>0.1.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Build</span>
            <span>Development</span>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChangePassphraseDialog
        open={showChangePassphrase}
        onOpenChange={setShowChangePassphrase}
      />
    </div>
  )
}
