import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  message?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export function LoadingSpinner({
  className,
  size = "md",
  message,
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
      />
      {message && (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
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
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
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
