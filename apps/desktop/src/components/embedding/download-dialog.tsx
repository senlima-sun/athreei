import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Download, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useEmbeddingModelConfig, useDownloadEmbeddingModel } from "@/hooks"

interface EmbeddingDownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownloadComplete: () => void
}

export function EmbeddingDownloadDialog({
  open,
  onOpenChange,
  onDownloadComplete,
}: EmbeddingDownloadDialogProps): React.ReactElement | null {
  const [skipPrompt, setSkipPrompt] = useState(false)
  const { data: config } = useEmbeddingModelConfig()
  const {
    mutateAsync: download,
    progress,
    isDownloading,
    isSuccess,
    isError,
    error,
    reset,
  } = useDownloadEmbeddingModel()

  if (!open) return null

  const handleDownload = async (): Promise<void> => {
    try {
      await download()
      onDownloadComplete()
    } catch {}
  }

  const handleClose = (): void => {
    if (!isDownloading) {
      reset()
      onOpenChange(false)
    }
  }

  const handleSkip = (): void => {
    if (skipPrompt) {
      localStorage.setItem("embedding-download-skipped", "true")
    }
    onOpenChange(false)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Download AI Model
            </CardTitle>
            {!isDownloading && (
              <button
                onClick={handleClose}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <CardDescription>
            Semantic search requires a local AI model for text embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model info */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">
                  {config?.name ?? "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">~118 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions:</span>
                <span className="font-medium">{config?.dimensions ?? 384}</span>
              </div>
            </div>
          </div>

          {/* Download progress */}
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(progress.downloaded)} /{" "}
                  {formatBytes(progress.total)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {progress.percent}% complete
              </p>
            </div>
          )}

          {/* Success state */}
          {isSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Model downloaded successfully!
              </span>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">
                {error instanceof Error
                  ? error.message
                  : "Download failed. Please try again."}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!isSuccess && (
              <>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : isError ? (
                    "Retry Download"
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Model
                    </>
                  )}
                </Button>

                {!isDownloading && (
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={skipPrompt}
                        onChange={(e) => setSkipPrompt(e.target.checked)}
                        className="h-3 w-3 rounded border-muted-foreground"
                      />
                      Don't ask again
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="text-xs"
                    >
                      Skip for now
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info text */}
          <p className="text-center text-xs text-muted-foreground">
            The model runs locally on your device. No data is sent externally.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Check if the download prompt should be skipped
 */
export function shouldShowDownloadPrompt(): boolean {
  return localStorage.getItem("embedding-download-skipped") !== "true"
}

/**
 * Reset the download prompt skip preference
 */
export function resetDownloadPromptSkip(): void {
  localStorage.removeItem("embedding-download-skipped")
}
