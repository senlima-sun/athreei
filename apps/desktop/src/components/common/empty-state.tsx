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
        "flex flex-1 flex-col items-center justify-center py-12 text-center animate-fade-in",
        className
      )}
    >
      <div className="relative mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
          <Icon className="h-6 w-6 text-brand" />
        </div>
        <div
          className="absolute inset-0 -z-10 scale-150 rounded-full opacity-50 blur-2xl"
          style={{ background: "var(--brand-light)" }}
        />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
