"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  SkillEffectivenessChart,
  RuleEffectivenessChart,
  type SkillEffectiveness,
  type RuleEffectiveness,
} from "@/components/analytics"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"
import { BarChart3, Star, Calendar, AlertCircle } from "lucide-react"

interface AnalyticsData {
  totalEvaluations: number
  averageRating: number
  skillEffectiveness: SkillEffectiveness[]
  ruleEffectiveness: RuleEffectiveness[]
}

export default function AnalyticsPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  )

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (isOrgPending || !activeOrg?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          organizationId: activeOrg.id,
        })

        if (dateRange !== "all") {
          const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - days)
          params.set("startDate", startDate.toISOString())
        }

        const response = await fetch(
          `${API_URL}/api/evaluations/analytics/overview?${params.toString()}`,
          { credentials: "include" }
        )

        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }

        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [activeOrg?.id, isOrgPending, dateRange])

  if (!activeOrg && !isOrgPending) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Track skill and rule effectiveness"
        />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No organization selected
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Please select an organization to view analytics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track skill and rule effectiveness based on user evaluations"
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) =>
              setDateRange(e.target.value as "7d" | "30d" | "90d" | "all")
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            Total Evaluations
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {data?.totalEvaluations.toLocaleString() ?? 0}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Star className="h-4 w-4" />
            Average Rating
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-gray-900">
                {data?.averageRating.toFixed(1) ?? "—"}
              </p>
              <span className="text-sm text-gray-500">/ 5</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillEffectivenessChart
          skills={data?.skillEffectiveness ?? []}
          isLoading={isLoading}
        />
        <RuleEffectivenessChart
          rules={data?.ruleEffectiveness ?? []}
          isLoading={isLoading}
        />
      </div>

      {!isLoading && data?.totalEvaluations === 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No evaluations yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Start rating trace responses to see analytics data here. Go to a
            trace detail page and submit a rating.
          </p>
        </div>
      )}
    </div>
  )
}
