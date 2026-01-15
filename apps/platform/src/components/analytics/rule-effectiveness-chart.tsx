"use client"

import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"

export interface RuleEffectiveness {
  id: string
  name: string
  averageRating: number
  evaluationCount: number
}

interface RuleEffectivenessChartProps {
  rules: RuleEffectiveness[]
  isLoading?: boolean
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return "text-green-600"
  if (rating >= 3) return "text-yellow-600"
  return "text-red-600"
}

function getRatingBgColor(rating: number): string {
  if (rating >= 4) return "bg-green-100"
  if (rating >= 3) return "bg-yellow-100"
  return "bg-red-100"
}

function getRatingTrend(rating: number) {
  if (rating >= 4) return <TrendingUp className="h-4 w-4 text-green-600" />
  if (rating >= 3) return <Minus className="h-4 w-4 text-yellow-600" />
  return <TrendingDown className="h-4 w-4 text-red-600" />
}

export function RuleEffectivenessChart({
  rules,
  isLoading,
}: RuleEffectivenessChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <Scale className="h-5 w-5 text-purple-600" />
          Rule Effectiveness
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <Scale className="h-5 w-5 text-purple-600" />
          Rule Effectiveness
        </h3>
        <p className="text-sm text-gray-500">
          No evaluation data available yet. Rate some traces to see rule
          effectiveness.
        </p>
      </div>
    )
  }

  const maxCount = Math.max(...rules.map((r) => r.evaluationCount))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
        <Scale className="h-5 w-5 text-purple-600" />
        Rule Effectiveness
      </h3>
      <div className="space-y-3">
        {rules.map((rule) => (
          <Link
            key={rule.id}
            href={`/dashboard/rules/${rule.id}`}
            className="block rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${getRatingBgColor(rule.averageRating)}`}
                >
                  {getRatingTrend(rule.averageRating)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-500">
                    {rule.evaluationCount} evaluation
                    {rule.evaluationCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-semibold ${getRatingColor(rule.averageRating)}`}
                >
                  {rule.averageRating.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">avg rating</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{
                    width: `${(rule.evaluationCount / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
