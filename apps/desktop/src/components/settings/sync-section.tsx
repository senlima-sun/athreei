import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cloud, RefreshCw, HardDrive, CheckCircle } from "lucide-react"
import {
  useMemoryCount,
  useSyncStatus,
  useSyncNow,
  useSyncPendingCount,
} from "@/hooks"
import { ErrorDisplay } from "@/components/common/error-display"
import { Section } from "./section"
import { SettingRow } from "./setting-row"

export function SyncSection(): React.ReactElement {
  const { data: memoryCount = 0 } = useMemoryCount()
  const { data: syncStatus } = useSyncStatus()
  const { data: pendingCount = 0 } = useSyncPendingCount()
  const syncNow = useSyncNow()

  const handleSyncNow = async (): Promise<void> => {
    await syncNow.mutateAsync()
  }

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
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
  )
}
