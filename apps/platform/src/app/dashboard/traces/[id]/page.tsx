"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { TraceDetail } from "@/components/traces/trace-detail"
import { TraceEvaluation } from "@/components/traces/trace-evaluation"
import { ArrowLeft, FileQuestion } from "lucide-react"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"
import type { Trace } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TraceDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: activeOrg } = useActiveOrganization()
  const [trace, setTrace] = useState<Trace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchTrace = async () => {
      setIsLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const response = await fetch(`/api/traces/${id}`)

        if (response.status === 404) {
          setNotFound(true)
          return
        }

        if (response.status === 403) {
          setError(
            "Access denied. You don't have permission to view this trace."
          )
          return
        }

        if (!response.ok) {
          throw new Error("Failed to fetch trace")
        }

        const data = await response.json()
        setTrace(data.trace)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trace")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrace()
  }, [id])

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Trace Details"
          description="Loading trace information..."
        />
        <LoadingState message="Loading trace details..." />
      </div>
    )
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="Trace not found" />
        <EmptyState
          icon={FileQuestion}
          title="Trace not found"
          description="This trace doesn't exist or you don't have access to it."
          action={{
            label: "Back to traces",
            href: "/dashboard/traces",
            icon: ArrowLeft,
          }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Error" />
        <ErrorState
          variant="section"
          title="Failed to load trace"
          message={error}
        />
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/traces"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to traces
          </Link>
        </div>
      </div>
    )
  }

  if (!trace) {
    return null
  }

  return (
    <div className="space-y-6">
      <TraceDetail trace={trace} />
      {activeOrg && (
        <TraceEvaluation
          trace={trace}
          apiUrl={API_URL}
          organizationId={activeOrg.id}
        />
      )}
    </div>
  )
}
