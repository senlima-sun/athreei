import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-6 text-center",
        className
      )}
    >
      <Icon className="mb-2 h-5 w-5 text-muted-foreground" />
      <h3 className="text-xs font-medium">{title}</h3>
      <p className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
