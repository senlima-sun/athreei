import { cn } from "@/lib/utils"

export type PermissionLevel = "allowed" | "denied" | "ask"

export interface PermissionBadgeProps {
  level: PermissionLevel
}

const permissionConfig: Record<
  PermissionLevel,
  { colorClass: string; bgClass: string; label: string }
> = {
  allowed: {
    colorClass: "text-success",
    bgClass: "bg-success/10",
    label: "Allowed",
  },
  denied: {
    colorClass: "text-error",
    bgClass: "bg-error/10",
    label: "Denied",
  },
  ask: {
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    label: "Ask",
  },
}

export function PermissionBadge({ level }: PermissionBadgeProps) {
  const config = permissionConfig[level]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.colorClass,
        config.bgClass,
        `border-current`
      )}
    >
      {config.label}
    </span>
  )
}
