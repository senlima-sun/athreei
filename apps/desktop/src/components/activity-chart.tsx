import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface DayData {
  day: string
  count: number
  date: Date
}

interface ActivityChartProps {
  data: DayData[]
  className?: string
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/**
 * Get the day label (Mon, Tue, etc.) from a Date
 */
function getDayLabel(date: Date): string {
  const dayIndex = date.getDay()
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1
  return DAY_LABELS[adjustedIndex]
}

/**
 * Get the last 7 days as DayData objects
 */
export function getLast7Days(): DayData[] {
  const days: DayData[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    days.push({
      day: getDayLabel(date),
      count: 0,
      date,
    })
  }

  return days
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Aggregate memory timestamps into daily counts for the last 7 days
 */
export function aggregateMemoriesByDay(timestamps: number[]): DayData[] {
  const days = getLast7Days()

  for (const timestamp of timestamps) {
    const memoryDate = new Date(timestamp * 1000)
    memoryDate.setHours(0, 0, 0, 0)

    for (const day of days) {
      if (isSameDay(memoryDate, day.date)) {
        day.count++
        break
      }
    }
  }

  return days
}

export function ActivityChart({
  data,
  className,
}: ActivityChartProps): React.ReactElement {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  )

  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Weekly Activity</span>
        <span className="text-sm text-muted-foreground">
          {total} memories this week
        </span>
      </div>

      <div className="flex h-32 items-end gap-2">
        {data.map((day, index) => {
          const height = day.count > 0 ? (day.count / maxCount) * 100 : 0
          const isToday = index === data.length - 1

          return (
            <div
              key={day.day}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">
                {day.count > 0 ? day.count : ""}
              </span>
              <div className="relative w-full flex-1">
                <div
                  className={cn(
                    "absolute bottom-0 w-full rounded-t transition-all",
                    isToday ? "bg-primary" : "bg-primary/60 dark:bg-primary/40",
                    day.count === 0 && "bg-muted"
                  )}
                  style={{
                    height: day.count > 0 ? `${Math.max(height, 8)}%` : "4px",
                  }}
                />
              </div>
              <span
                className={cn(
                  "text-xs",
                  isToday
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {day.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
