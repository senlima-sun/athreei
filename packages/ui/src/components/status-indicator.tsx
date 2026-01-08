"use client"

import { cn } from "../lib/utils"

export type StatusType = "online" | "offline" | "warning" | "error"

export interface StatusIndicatorProps {
  status: StatusType
  label?: string
  size?: "sm" | "md" | "lg"
}

const statusColors: Record<StatusType, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  warning: "bg-warning",
  error: "bg-error",
}

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
}

const labelSizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

export function StatusIndicator({
  status,
  label,
  size = "md",
}: StatusIndicatorProps) {
  const shouldPulse = status === "online"

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block rounded-full",
          statusColors[status],
          sizeMap[size],
          shouldPulse && "animate-pulse"
        )}
      />
      {label && (
        <span className={cn("text-muted-foreground", labelSizeMap[size])}>
          {label}
        </span>
      )}
    </div>
  )
}
