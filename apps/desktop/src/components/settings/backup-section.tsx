import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Archive,
  Download,
  Upload,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { useExportBackup, useImportBackup } from "@/hooks"
import type { ImportStrategy } from "@/lib/api"
import { ErrorDisplay } from "@/components/common/error-display"
import { Section } from "./section"
import { SettingRow } from "./setting-row"

export function BackupSection(): React.ReactElement {
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>("skip")
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const exportBackup = useExportBackup()
  const importBackup = useImportBackup()

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

  return (
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
  )
}
