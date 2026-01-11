import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  error: Error | unknown
  onRetry?: () => void
  className?: string
}

export function ErrorDisplay({
  error,
  onRetry,
  className,
}: ErrorDisplayProps): React.ReactElement {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred"

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded bg-destructive/10 px-2 py-1.5",
        className
      )}
    >
      <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
      <span className="flex-1 truncate text-[10px] text-destructive">
        {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

interface PageErrorProps {
  error: Error | unknown
  onRetry?: () => void
}

export function PageError({
  error,
  onRetry,
}: PageErrorProps): React.ReactElement {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred"

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-destructive" />
      <p className="text-xs font-medium">Something went wrong</p>
      <p className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-3 h-6 gap-1 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  )
}

interface FullPageErrorProps {
  error: Error | unknown
  onRetry?: () => void
}

export function FullPageError({
  error,
  onRetry,
}: FullPageErrorProps): React.ReactElement {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-4">
      <PageError error={error} onRetry={onRetry} />
    </div>
  )
}
