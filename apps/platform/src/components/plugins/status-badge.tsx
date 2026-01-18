"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PluginInstallationStatus } from "@/types/marketplace"

const statusConfig: Record<
  PluginInstallationStatus | "error",
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  disabled: {
    label: "Disabled",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  pending_update: {
    label: "Update Available",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  error: {
    label: "Error",
    className: "bg-red-50 text-red-700 border-red-200",
  },
}

interface StatusBadgeProps {
  status: PluginInstallationStatus | "error"
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
