export interface DateFormatOptions {
  includeTime?: boolean
  includeYear?: boolean
  relative?: boolean
}

export function formatDate(
  timestamp: number,
  options: DateFormatOptions = {}
): string {
  const { includeTime = false, includeYear = true } = options
  const date = new Date(timestamp * 1000)

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  }

  if (includeYear) {
    dateOptions.year = "numeric"
  }

  const dateString = date.toLocaleDateString(undefined, dateOptions)

  if (includeTime) {
    const timeString = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `${dateString} at ${timeString}`
  }

  return dateString
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const date = new Date(timestamp * 1000)
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return "Just now"
  }

  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`
  }

  if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`
  }

  if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
  }

  return formatDate(timestamp)
}

export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp * 1000)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isYesterday(timestamp: number): boolean {
  const date = new Date(timestamp * 1000)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  )
}

export function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

export function getStartOfMonth(date: Date = new Date()): Date {
  const start = new Date(date)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return start
}
