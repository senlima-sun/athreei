import { format, isToday, isYesterday } from "date-fns"

interface DateGroupHeaderProps {
  date: Date
  className?: string
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMMM d, yyyy")
}

export function DateGroupHeader({
  date,
  className,
}: DateGroupHeaderProps): React.ReactElement {
  return (
    <div className={className} role="heading" aria-level={2}>
      <span className="text-xs font-medium text-muted-foreground">
        {formatDateLabel(date)}
      </span>
    </div>
  )
}
