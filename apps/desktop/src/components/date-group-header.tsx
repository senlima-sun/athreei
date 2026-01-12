import { format, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"

interface DateGroupHeaderProps {
  date: Date
  className?: string
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "EEEE, MMMM d")
}

export function DateGroupHeader({
  date,
  className,
}: DateGroupHeaderProps): React.ReactElement {
  const isTodayOrYesterday = isToday(date) || isYesterday(date)

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 py-2 backdrop-blur-sm",
        className
      )}
      role="heading"
      aria-level={2}
    >
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider",
          isTodayOrYesterday ? "text-brand" : "text-muted-foreground"
        )}
      >
        {formatDateLabel(date)}
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  )
}
