"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { TraceDetail } from "@/components/traces/trace-detail"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import type { Trace } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TraceDetailPage({ params }: PageProps) {
  const { id } = use(params)
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="Trace not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Trace not found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            This trace doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard/traces"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to traces
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Error" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-red-900">
            Failed to load trace
          </h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Link
            href="/dashboard/traces"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
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
    <div>
      <TraceDetail trace={trace} />
    </div>
  )
}
