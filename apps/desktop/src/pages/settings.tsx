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
  ChevronRight,
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

  const { data: syncStatus } = useSyncStatus()
  const { data: pendingCount = 0 } = useSyncPendingCount()
  const syncNow = useSyncNow()

  const handleSyncNow = async (): Promise<void> => {
    await syncNow.mutateAsync()
  }

  const exportBackup = useExportBackup()
  const importBackup = useImportBackup()
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
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
    const { open } = await import("@tauri-apps/plugin-dialog")
    const path = await open({
      multiple: false,
      filters: [{ name: "aiii Backup", extensions: ["aiii"] }],
    })

    if (path && typeof path === "string") {
      const result = await importBackup.mutateAsync({
        path,
        strategy: importStrategy,
      })
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
    <div className="space-y-4">
      {/* Vault */}
      <Section
        icon={Shield}
        title="Vault"
        badge={
          <Badge variant="success" className="gap-0.5">
            <CheckCircle className="h-2.5 w-2.5" />
            Unlocked
          </Badge>
        }
      >
        <SettingRow
          label="Lock Vault"
          description="Protect your memories"
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleLockVault}
              loading={vaultLock.isPending}
            >
              <Lock className="h-3 w-3" />
              Lock
            </Button>
          }
        />
        {vaultLock.error && <ErrorDisplay error={vaultLock.error} />}

        <SettingRow
          label="Encryption"
          description="Local encryption with your passphrase"
          action={
            <Badge variant="outline">
              <Key className="h-2.5 w-2.5" />
              AES-256
            </Badge>
          }
        />

        <SettingRow
          label="Change Passphrase"
          description="Update vault passphrase"
          action={
            <button
              onClick={() => setShowChangePassphrase(true)}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Change
              <ChevronRight className="h-3 w-3" />
            </button>
          }
        />
      </Section>

      {/* MCP Server */}
      <Section
        icon={Server}
        title="MCP Server"
        badge={
          mcpLoading ? (
            <Badge variant="outline">...</Badge>
          ) : mcpStatus?.running ? (
            <Badge variant="success" className="gap-0.5">
              <CheckCircle className="h-2.5 w-2.5" />
              Running
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-0.5">
              <AlertCircle className="h-2.5 w-2.5" />
              Stopped
            </Badge>
          )
        }
      >
        <SettingRow
          label="Server Control"
          description={
            mcpStatus?.running
              ? `${mcpStatus.transport} transport`
              : "Start to connect AI apps"
          }
          action={
            <Button
              variant={mcpStatus?.running ? "destructive" : "default"}
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleMcpToggle}
              loading={mcpStart.isPending || mcpStop.isPending}
            >
              {mcpStatus?.running ? (
                <>
                  <Square className="h-2.5 w-2.5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-2.5 w-2.5" />
                  Start
                </>
              )}
            </Button>
          }
        />
        {mcpError && <ErrorDisplay error={mcpError} />}

        {mcpStatus?.running && mcpStatus?.port && (
          <div className="flex items-center justify-between rounded bg-green-500/10 px-2 py-1.5">
            <code className="text-[10px] text-green-600 dark:text-green-400">
              http://127.0.0.1:{mcpStatus.port}/mcp
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `http://127.0.0.1:${mcpStatus.port}/mcp`
                )
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
        )}

        <SettingRow
          label="Setup Guide"
          description="Connect Claude Desktop"
          action={
            <button className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" />
            </button>
          }
        />
      </Section>

      {/* Sync */}
      <Section
        icon={Cloud}
        title="Sync"
        badge={
          syncStatus?.enabled ? (
            <Badge variant="success" className="gap-0.5">
              <CheckCircle className="h-2.5 w-2.5" />
              On
            </Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )
        }
      >
        <SettingRow
          label="Cloud Sync"
          description={
            syncStatus?.enabled
              ? `Last: ${formatLastSync(syncStatus.last_sync)}`
              : "Sync to athreei cloud"
          }
          action={
            syncStatus?.enabled ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={handleSyncNow}
                loading={syncNow.isPending}
              >
                <RefreshCw className="h-3 w-3" />
                Sync
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Coming Soon
              </span>
            )
          }
        />
        {syncNow.error && <ErrorDisplay error={syncNow.error} />}

        {syncStatus?.enabled && pendingCount > 0 && (
          <SettingRow
            label="Pending"
            description="Local changes waiting"
            action={<Badge variant="outline">{pendingCount}</Badge>}
          />
        )}

        <SettingRow
          label="Local Storage"
          description="SQLite on this machine"
          action={
            <Badge variant="outline">
              <HardDrive className="h-2.5 w-2.5" />
              {memoryCount}
            </Badge>
          }
        />
      </Section>

      {/* Backup */}
      <Section icon={Archive} title="Backup">
        <SettingRow
          label="Export"
          description="Save memories to file"
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleExport}
              disabled={exportBackup.isPending}
            >
              {exportBackup.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              Export
            </Button>
          }
        />
        {exportBackup.error && <ErrorDisplay error={exportBackup.error} />}
        {exportSuccess && (
          <div className="flex items-center gap-1.5 rounded bg-green-500/10 px-2 py-1.5 text-[10px] text-green-600">
            <CheckCircle className="h-3 w-3" />
            {exportSuccess}
          </div>
        )}

        <SettingRow
          label="Import"
          description="Restore from backup"
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleImport}
              disabled={importBackup.isPending}
            >
              {importBackup.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Import
            </Button>
          }
        />
        {importBackup.error && <ErrorDisplay error={importBackup.error} />}
        {importSuccess && (
          <div className="flex items-center gap-1.5 rounded bg-green-500/10 px-2 py-1.5 text-[10px] text-green-600">
            <CheckCircle className="h-3 w-3" />
            {importSuccess}
          </div>
        )}

        <SettingRow
          label="Strategy"
          description="Handle existing data"
          action={
            <select
              value={importStrategy}
              onChange={(e) =>
                setImportStrategy(e.target.value as ImportStrategy)
              }
              className="h-6 rounded bg-muted px-1.5 text-[10px]"
            >
              <option value="skip">Skip existing</option>
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
          }
        />
      </Section>

      {/* About */}
      <Section title="About">
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <span className="text-muted-foreground">Version</span>
          <span>0.1.0</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <span className="text-muted-foreground">Build</span>
          <span>Development</span>
        </div>
      </Section>

      <ChangePassphraseDialog
        open={showChangePassphrase}
        onOpenChange={setShowChangePassphrase}
      />
    </div>
  )
}

interface SectionProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}

function Section({
  icon: Icon,
  title,
  badge,
  children,
}: SectionProps): React.ReactElement {
  return (
    <section className="rounded-md bg-card">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <h3 className="text-xs font-medium">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="space-y-0.5 px-3 pb-2">{children}</div>
    </section>
  )
}

interface SettingRowProps {
  label: string
  description: string
  action: React.ReactNode
}

function SettingRow({
  label,
  description,
  action,
}: SettingRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="ml-2 shrink-0">{action}</div>
    </div>
  )
}
