import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  trend?: {
    value: number
    direction: "up" | "down"
  }
  className?: string
}

export function StatsCard({
  icon: Icon,
  value,
  label,
  trend,
  className,
}: StatsCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md bg-card px-3 py-2",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs",
              trend.direction === "up"
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}%
          </span>
        )}
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
