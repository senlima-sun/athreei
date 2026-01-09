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
        "flex items-start gap-3 rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="rounded-md bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend.direction === "up"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
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
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
