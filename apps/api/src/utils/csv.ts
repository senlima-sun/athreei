import type { trace } from "@athreei/db"

type TraceRecord = typeof trace.$inferSelect

export function generateTraceCsv(traces: TraceRecord[]): string {
  const headers = [
    "id",
    "traceId",
    "name",
    "status",
    "statusMessage",
    "durationMs",
    "startTime",
    "endTime",
  ]

  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return ""
    }
    const stringValue = String(value)
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const rows = traces.map((t) => [
    t.id,
    t.traceId,
    t.name,
    t.status,
    t.statusMessage,
    t.durationMs,
    t.startTime,
    t.endTime,
  ])

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ]

  return csvLines.join("\n")
}
