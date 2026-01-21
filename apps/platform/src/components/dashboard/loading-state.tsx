import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type LoadingVariant = "page" | "section" | "inline"

interface LoadingStateProps {
  message?: string
  variant?: LoadingVariant
  skeleton?: boolean
  className?: string
}

const variantStyles: Record<LoadingVariant, string> = {
  page: "min-h-[60vh] py-12",
  section: "py-12",
  inline: "py-4",
}

const spinnerSizes: Record<LoadingVariant, string> = {
  page: "h-10 w-10",
  section: "h-8 w-8",
  inline: "h-5 w-5",
}

function SkeletonLoader({ variant }: { variant: LoadingVariant }) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
      </div>
      {variant === "page" && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}
    </div>
  )
}

export function LoadingState({
  message,
  variant = "section",
  skeleton = false,
  className,
}: LoadingStateProps) {
  if (skeleton) {
    return (
      <div
        className={cn(
          variantStyles[variant],
          "flex items-center justify-center",
          className
        )}
        role="status"
        aria-label={message || "Loading content"}
      >
        <SkeletonLoader variant={variant} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        variantStyles[variant],
        className
      )}
      role="status"
      aria-label={message || "Loading"}
    >
      <Loader2
        className={cn("animate-spin text-gray-400", spinnerSizes[variant])}
      />
      {message && (
        <p
          className={cn(
            "mt-2 text-gray-500",
            variant === "inline" ? "text-xs" : "text-sm"
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
