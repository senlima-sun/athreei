import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  message?: string
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

export function LoadingSpinner({
  className,
  size = "md",
  message,
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
      />
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({
  message = "Loading...",
}: PageLoadingProps): React.ReactElement {
  return (
    <div className="flex h-32 items-center justify-center">
      <LoadingSpinner size="md" message={message} />
    </div>
  )
}

interface FullPageLoadingProps {
  message?: string
}

export function FullPageLoading({
  message = "Loading...",
}: FullPageLoadingProps): React.ReactElement {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" message={message} />
    </div>
  )
}
