import { Brain, Download, RefreshCw, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section } from "./section"
import { SettingRow } from "./setting-row"
import {
  useEmbeddingStatus,
  useIsEmbeddingModelDownloaded,
  useEmbeddingModelConfig,
  useDownloadEmbeddingModel,
  useBackfillEmbeddings,
  useTraceAnalytics,
  useCleanupTraces,
} from "@/hooks"
import { useState } from "react"

export function AISection(): React.ReactElement {
  return (
    <Section icon={Brain} title="AI Features">
      <EmbeddingSettings />
      <TraceSettings />
    </Section>
  )
}

function EmbeddingSettings(): React.ReactElement {
  const [showProgress, setShowProgress] = useState(false)
  const { data: status, isLoading: statusLoading } = useEmbeddingStatus()
  const { data: isDownloaded, isLoading: downloadedLoading } =
    useIsEmbeddingModelDownloaded()
  const { data: config } = useEmbeddingModelConfig()
  const {
    mutateAsync: download,
    progress,
    isDownloading,
  } = useDownloadEmbeddingModel()
  const { mutateAsync: backfill, isPending: isBackfilling } =
    useBackfillEmbeddings()

  const handleDownload = async (): Promise<void> => {
    setShowProgress(true)
    try {
      await download()
    } finally {
      setShowProgress(false)
    }
  }

  const handleBackfill = async (): Promise<void> => {
    await backfill(100)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  if (statusLoading || downloadedLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="px-2 py-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Embedding Model
        </p>
      </div>

      <SettingRow
        label="Model Status"
        description={
          isDownloaded
            ? `${config?.name ?? "Model"} loaded (${config?.dimensions ?? 384} dimensions)`
            : "Not downloaded"
        }
        action={
          isDownloaded ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Ready
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              Not Installed
            </span>
          )
        }
      />

      {!isDownloaded && (
        <SettingRow
          label="Download Model"
          description="~118 MB download for semantic search"
          action={
            <Button
              size="sm"
              className="h-6 gap-1 text-[10px]"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {progress.percent}%
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  Download
                </>
              )}
            </Button>
          }
        />
      )}

      {isDownloading && showProgress && (
        <div className="mx-2 space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
          </p>
        </div>
      )}

      {isDownloaded && status && (
        <>
          <SettingRow
            label="Embeddings Status"
            description={`${status.with_embeddings} of ${status.total_memories} memories indexed`}
            action={
              status.without_embeddings > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 gap-1 text-[10px]"
                  onClick={handleBackfill}
                  disabled={isBackfilling}
                >
                  {isBackfilling ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Index {status.without_embeddings}
                    </>
                  )}
                </Button>
              ) : (
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  All indexed
                </span>
              )
            }
          />
        </>
      )}
    </div>
  )
}

function TraceSettings(): React.ReactElement {
  const [retentionDays, setRetentionDays] = useState(30)
  const { data: analytics, isLoading } = useTraceAnalytics(30)
  const { mutateAsync: cleanup, isPending: isCleaning } = useCleanupTraces()
  const [lastCleanupCount, setLastCleanupCount] = useState<number | null>(null)

  const handleCleanup = async (): Promise<void> => {
    const count = await cleanup(retentionDays)
    setLastCleanupCount(count)
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="px-2 py-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Trace Analytics
        </p>
      </div>

      <SettingRow
        label="Stored Traces"
        description={
          isLoading
            ? "Loading..."
            : `${analytics?.total_traces ?? 0} traces from ${analytics?.total_sessions ?? 0} sessions`
        }
        action={
          <span className="text-[10px] text-muted-foreground">
            Last 30 days
          </span>
        }
      />

      <SettingRow
        label="Retention Period"
        description="Delete traces older than this"
        action={
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="h-6 rounded border bg-transparent px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        }
      />

      <SettingRow
        label="Cleanup Now"
        description={
          lastCleanupCount !== null
            ? `Deleted ${lastCleanupCount} traces`
            : "Remove traces older than retention period"
        }
        action={
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 text-[10px]"
            onClick={handleCleanup}
            disabled={isCleaning}
          >
            {isCleaning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3" />
                Clean Up
              </>
            )}
          </Button>
        }
      />
    </div>
  )
}
