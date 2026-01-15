"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { RuleCardGrid } from "@/components/rules"
import { useActiveOrganization } from "@/lib/auth-client"
import { Plus, Scale } from "lucide-react"
import { API_URL } from "@/constants"
import type { Rule } from "@/types"

export default function RulesPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [rules, setRules] = useState<Rule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRules = async () => {
    if (!activeOrg?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/rules?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch rules")
      }

      const data = await response.json()
      setRules(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOrgPending) {
      loadRules()
    }
  }, [activeOrg?.id, isOrgPending])

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/api/rules/${id}?organizationId=${activeOrg?.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isEnabled: enabled }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update rule")
      }

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === id ? { ...rule, isEnabled: enabled } : rule
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule")
    }
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Rules"
          description="Manage AI behavior guidelines and constraints"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Rules"
          description="Manage AI behavior guidelines and constraints"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view rules.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Rules"
          description="Manage AI behavior guidelines and constraints"
        />
        <ErrorState message={error} onRetry={() => loadRules()} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Rules"
        description="Manage AI behavior guidelines and constraints"
        actions={
          <Link
            href="/dashboard/rules/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </Link>
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No rules yet"
          description="Create your first rule to define AI behavior guidelines."
          action={{
            label: "Create Rule",
            href: "/dashboard/rules/new",
            icon: Plus,
          }}
        />
      ) : (
        <RuleCardGrid
          rules={rules}
          baseHref="/dashboard/rules"
          showActions={true}
          onToggle={handleToggle}
        />
      )}
    </div>
  )
}
