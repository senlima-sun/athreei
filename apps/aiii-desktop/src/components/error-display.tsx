import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
        "flex items-center gap-3 rounded-lg bg-destructive/10 p-4",
        className
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">Error</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
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
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="text-center">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
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
