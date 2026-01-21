import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type ErrorVariant = "page" | "section" | "inline"

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  variant?: ErrorVariant
  title?: string
  className?: string
}

const variantStyles: Record<ErrorVariant, string> = {
  page: "min-h-[60vh] py-12",
  section: "p-6",
  inline: "p-3",
}

const iconSizes: Record<ErrorVariant, string> = {
  page: "h-12 w-12",
  section: "h-8 w-8",
  inline: "h-5 w-5",
}

export function ErrorState({
  message,
  onRetry,
  variant = "section",
  title,
  className,
}: ErrorStateProps) {
  const isInline = variant === "inline"

  if (isInline) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2",
          className
        )}
        role="alert"
      >
        <AlertCircle
          className={cn("shrink-0 text-red-400", iconSizes[variant])}
        />
        <p className="text-xs text-red-600">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto shrink-0 text-xs font-medium text-red-700 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 text-center",
        variantStyles[variant],
        className
      )}
      role="alert"
    >
      <AlertCircle className={cn("text-red-400", iconSizes[variant])} />
      {title && (
        <h3
          className={cn(
            "mt-3 font-medium text-red-800",
            variant === "page" ? "text-lg" : "text-base"
          )}
        >
          {title}
        </h3>
      )}
      <p
        className={cn(
          "text-red-600",
          title ? "mt-1" : "mt-2",
          variant === "page" ? "max-w-md text-sm" : "text-sm"
        )}
      >
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-md bg-red-100 font-medium text-red-700 transition-colors hover:bg-red-200",
            variant === "page" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-sm"
          )}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  )
}
