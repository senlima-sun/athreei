"use client"

import { useState } from "react"
import Link from "next/link"
import { PageHeader, LoadingState, EmptyState } from "@/components/dashboard"
import { useActiveOrganization } from "@/lib/auth-client"
import {
  useErrorOverview,
  useErrorsByTool,
  useErrorsByServer,
  useCommonErrorMessages,
  useErrorTrend,
} from "@/hooks/use-error-analytics"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Server,
  Wrench,
  MessageSquare,
  ExternalLink,
} from "lucide-react"

const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
] as const

function getDateRange(option: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString()
  let startDate: Date

  switch (option) {
    case "7days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "90days":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { startDate: startDate.toISOString(), endDate }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "gray",
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color?: "gray" | "green" | "red" | "yellow"
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

function TrendChart({ data }: { data: Array<{ date: string; errors: number; total: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No data available
      </div>
    )
  }

  const maxErrors = Math.max(...data.map((d) => d.errors), 1)

  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((day, i) => {
        const height = (day.errors / maxErrors) * 100
        return (
          <div
            key={i}
            className="group relative flex-1"
            title={`${day.date}: ${day.errors} errors / ${day.total} total`}
          >
            <div
              className="w-full rounded-t bg-red-400 transition-colors hover:bg-red-500"
              style={{ height: `${Math.max(height, 4)}%` }}
            />
            <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
              <div>{day.date}</div>
              <div>
                {day.errors} / {day.total}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface BarChartItem {
  label: string | null
  value: number
  errorRate: number
}

function BarChart({
  data,
  maxItems = 10,
}: {
  data: BarChartItem[]
  maxItems?: number
}) {
  const items = data.slice(0, maxItems)
  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...items.map((d) => d.value), 1)

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const value = item.value
        const width = (value / maxValue) * 100
        const label = item.label
        const errorRate = item.errorRate

        return (
          <div key={i} className="group">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate text-gray-700" title={label ?? undefined}>
                {label || "Unknown"}
              </span>
              <span className="ml-2 text-gray-500">
                {value} ({errorRate.toFixed(1)}%)
              </span>
            </div>
            <div className="h-4 w-full rounded-full bg-gray-100">
              <div
                className="h-4 rounded-full bg-red-400"
                style={{ width: `${Math.max(width, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ErrorAnalyticsPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [dateRange, setDateRange] = useState<string>("7days")

  const params = getDateRange(dateRange)

  const { data: overviewData, isPending: isOverviewPending } =
    useErrorOverview(params)
  const { data: byToolData, isPending: isToolPending } =
    useErrorsByTool(params)
  const { data: byServerData, isPending: isServerPending } =
    useErrorsByServer(params)
  const { data: messagesData, isPending: isMessagesPending } =
    useCommonErrorMessages(params)
  const { data: trendData, isPending: isTrendPending } = useErrorTrend(params)

  const isLoading =
    isOrgPending ||
    isOverviewPending ||
    isToolPending ||
    isServerPending ||
    isMessagesPending ||
    isTrendPending

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Error Analysis"
          description="Understand error patterns and troubleshoot issues"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Error Analysis"
          description="Understand error patterns and troubleshoot issues"
        />
        <EmptyState
          icon={AlertTriangle}
          title="No organization selected"
          description="Select an organization to view error analytics."
        />
      </div>
    )
  }

  const overview = overviewData?.overview
  const trend = trendData?.trend || []
  const byTool = byToolData?.byTool || []
  const byServer = byServerData?.byServer || []
  const messages = messagesData?.commonMessages || []

  return (
    <div>
      <PageHeader
        title="Error Analysis"
        description="Understand error patterns and troubleshoot issues"
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={overview?.total?.toLocaleString() ?? 0}
          icon={BarChart3}
          color="gray"
        />
        <StatCard
          title="Successful"
          value={overview?.success?.toLocaleString() ?? 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Errors"
          value={overview?.errors?.toLocaleString() ?? 0}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Error Rate"
          value={`${overview?.errorRate?.toFixed(2) ?? 0}%`}
          icon={
            (overview?.errorRate ?? 0) > 5
              ? TrendingUp
              : (overview?.errorRate ?? 0) > 0
                ? Minus
                : TrendingDown
          }
          color={(overview?.errorRate ?? 0) > 5 ? "red" : (overview?.errorRate ?? 0) > 1 ? "yellow" : "green"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Error Trend</h3>
            </div>
            <span className="text-xs text-gray-500">Daily errors</span>
          </div>
          <TrendChart data={trend} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Errors by Tool</h3>
            </div>
            <Link
              href={`/dashboard/traces?status=error`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              View traces <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <BarChart
            data={byTool.map((t) => ({
              label: t.toolName,
              value: t.errors,
              errorRate: t.errorRate,
            }))}
            maxItems={5}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Errors by Server</h3>
            </div>
          </div>
          <BarChart
            data={byServer.map((s) => ({
              label: s.serverId,
              value: s.errors,
              errorRate: s.errorRate,
            }))}
            maxItems={5}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Common Error Messages</h3>
          </div>
          {messages.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
              No error messages found
            </div>
          ) : (
            <div className="space-y-3">
              {messages.slice(0, 5).map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between rounded-lg bg-red-50 p-3"
                >
                  <p
                    className="flex-1 truncate text-sm text-red-700"
                    title={msg.message}
                  >
                    {msg.message}
                  </p>
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {msg.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
