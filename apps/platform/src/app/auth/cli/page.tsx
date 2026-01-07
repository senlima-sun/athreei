"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Terminal, Check, X, Loader2 } from "lucide-react"
import { useSession, useListOrganizations } from "@/lib/auth-client"

interface Organization {
  id: string
  name: string
  slug?: string | null
  createdAt: Date
}

export default function CLIAuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const { data: orgList, isPending: orgsLoading } = useListOrganizations()

  const sessionId = searchParams.get("session")

  const organizations = (orgList ?? []) as Organization[]
  const [selectedOrg, setSelectedOrg] = useState<string>("")
  const [authorizing, setAuthorizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Set default selected org when organizations load
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrg) {
      setSelectedOrg(organizations[0].id)
    }
  }, [organizations, selectedOrg])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      const returnUrl = encodeURIComponent(`/auth/cli?session=${sessionId}`)
      router.push(`/login?redirect=${returnUrl}`)
    }
  }, [session, sessionLoading, sessionId, router])

  async function handleAuthorize() {
    if (!selectedOrg || !sessionId) return

    setAuthorizing(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/cli/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          organizationId: selectedOrg,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Authorization failed")
      }

      const { token } = await res.json()
      setSuccess(true)

      // Redirect to localhost callback
      const callbackUrl = `http://127.0.0.1:19284/callback?token=${encodeURIComponent(token)}&state=${sessionId}`
      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed")
      setAuthorizing(false)
    }
  }

  function handleCancel() {
    window.close()
  }

  const loading = sessionLoading || orgsLoading

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Authorization Successful
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                You can close this window and return to the terminal.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-red-100 p-3">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Invalid Request
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Missing session parameter. Please try again from the CLI.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Terminal className="h-6 w-6 text-gray-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Authorize CLI Access
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            athreei CLI is requesting access to your account
          </p>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Organization
            </label>
            <div className="space-y-2">
              {organizations.length === 0 ? (
                <p className="text-sm text-gray-500">No organizations found</p>
              ) : (
                organizations.map((org) => (
                  <label
                    key={org.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="organization"
                      value={org.id}
                      checked={selectedOrg === org.id}
                      onChange={() => setSelectedOrg(org.id)}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {org.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">CLI will be able to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>Manage MCP servers</li>
              <li>Manage Endpoints</li>
              <li>View Traces</li>
              <li>Manage API keys (based on your role)</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAuthorize}
              disabled={!selectedOrg || authorizing}
              className="flex flex-1 items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authorizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
