"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

export type ValidationStatus = "valid" | "warning" | "invalid" | "pending"

interface ValidationBadgeProps {
  status: ValidationStatus
  errors?: Array<{ path: string; message: string; code: string }>
  warnings?: Array<{ path: string; message: string; code: string }>
  className?: string
  showLabel?: boolean
}

const statusConfig = {
  valid: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Claude Code Compatible",
    tooltip: "This plugin is fully compatible with Claude Code",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Compatible with warnings",
    tooltip: "This plugin is compatible but has some recommendations",
  },
  invalid: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Validation failed",
    tooltip: "This plugin may not work correctly with Claude Code",
  },
  pending: {
    icon: Clock,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Not validated",
    tooltip: "This plugin has not been validated yet",
  },
}

export function ValidationBadge({
  status,
  errors,
  warnings,
  className,
  showLabel = false,
}: ValidationBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  const tooltipContent = React.useMemo(() => {
    const lines: string[] = [config.tooltip]

    if (errors && errors.length > 0) {
      lines.push("")
      lines.push(`Errors (${errors.length}):`)
      errors.slice(0, 3).forEach((e) => {
        lines.push(`• ${e.message}`)
      })
      if (errors.length > 3) {
        lines.push(`... and ${errors.length - 3} more`)
      }
    }

    if (warnings && warnings.length > 0) {
      lines.push("")
      lines.push(`Warnings (${warnings.length}):`)
      warnings.slice(0, 3).forEach((w) => {
        lines.push(`• ${w.message}`)
      })
      if (warnings.length > 3) {
        lines.push(`... and ${warnings.length - 3} more`)
      }
    }

    return lines.join("\n")
  }, [config.tooltip, errors, warnings])

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          className={cn(
            "inline-flex cursor-default items-center gap-1.5",
            showLabel && [
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              config.bgColor,
              config.borderColor,
            ],
            className
          )}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
          {showLabel && (
            <span className={cn("text-xs", config.color)}>{config.label}</span>
          )}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={4}>
            <TooltipPrimitive.Popup className="max-w-xs whitespace-pre-line rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
              {tooltipContent}
              <TooltipPrimitive.Arrow className="fill-gray-900" />
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export function ValidationStatusText({
  status,
  className,
}: {
  status: ValidationStatus
  className?: string
}) {
  const config = statusConfig[status]

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <config.icon className={cn("h-3.5 w-3.5", config.color)} />
      <span className={cn("text-sm", config.color)}>{config.label}</span>
    </span>
  )
}
