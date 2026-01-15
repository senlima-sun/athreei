"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader, LoadingState, ErrorState } from "@/components/dashboard"
import { RuleForm } from "@/components/rules"
import { useActiveOrganization } from "@/lib/auth-client"
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertTriangle,
  Globe,
  Boxes,
  Server,
} from "lucide-react"
import { API_URL } from "@/constants"
import type { Rule, RuleFormData, RuleScope } from "@/types"

const SCOPE_ICONS: Record<
  RuleScope,
  React.ComponentType<{ className?: string }>
> = {
  global: Globe,
  namespace: Boxes,
  endpoint: Server,
}

const SCOPE_LABELS: Record<RuleScope, string> = {
  global: "Global",
  namespace: "Namespace",
  endpoint: "Endpoint",
}

export default function RuleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ruleId = params.id as string
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()

  const [rule, setRule] = useState<Rule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchRule = useCallback(async () => {
    if (!activeOrg?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/rules/${ruleId}?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Rule not found")
        }
        throw new Error("Failed to fetch rule")
      }

      const data = await response.json()
      setRule(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rule")
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, activeOrg?.id])

  useEffect(() => {
    if (!isOrgPending && activeOrg?.id) {
      fetchRule()
    }
  }, [fetchRule, isOrgPending, activeOrg?.id])

  const handleSubmit = async (data: RuleFormData) => {
    if (!activeOrg?.id) {
      throw new Error("Please select an organization first")
    }

    const response = await fetch(
      `${API_URL}/api/rules/${ruleId}?organizationId=${activeOrg.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update rule")
    }

    const result = await response.json()
    setRule(result.data)
  }

  const handleDelete = async () => {
    if (!activeOrg?.id) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `${API_URL}/api/rules/${ruleId}?organizationId=${activeOrg.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete rule")
      }

      router.push("/dashboard/rules")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule")
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader title="Rule Details" />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader title="Rule Details" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view this rule.
          </p>
        </div>
      </div>
    )
  }

  if (error || !rule) {
    return (
      <div>
        <PageHeader title="Rule not found" />
        <div className="space-y-4">
          <ErrorState
            message={
              error || "This rule doesn't exist or you don't have access to it."
            }
          />
          <div className="text-center">
            <Link
              href="/dashboard/rules"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to rules
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const ScopeIcon = SCOPE_ICONS[rule.scope]

  return (
    <div>
      <PageHeader
        title={rule.name}
        description={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                rule.isEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  rule.isEnabled ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {rule.isEnabled ? "Enabled" : "Disabled"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              <ScopeIcon className="h-3 w-3" />
              {SCOPE_LABELS[rule.scope]}
            </span>
            <span className="text-sm text-gray-500">
              Priority #{rule.priority}
            </span>
          </div>
        }
        actions={
          <Link
            href="/dashboard/rules"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="space-y-8">
        <div className="mx-auto max-w-lg">
          <RuleForm
            rule={rule}
            onSubmit={handleSubmit}
            cancelHref="/dashboard/rules"
            submitLabel="Save Changes"
          />
        </div>

        <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible actions that affect this rule.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete rule
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this rule?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. The rule will be removed
                      from all namespaces where it is assigned.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Yes, delete rule
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
