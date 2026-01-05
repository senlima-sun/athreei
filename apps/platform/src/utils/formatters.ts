/**
 * Formatting utility functions for display
 */

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "123ms" or "1.23s"
 */
export function formatDuration(ms?: number | null): string {
  if (ms == null) return "-"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format an ISO date string to a localized date/time string.
 * @param dateString - ISO 8601 date string
 * @returns Localized date/time string
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

/**
 * Format an ISO date string to a localized date string (no time).
 * @param dateString - ISO 8601 date string
 * @returns Localized date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

/**
 * Format a number as bytes with appropriate unit.
 * @param bytes - Number of bytes
 * @returns Formatted string like "1.5 KB" or "2.3 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
