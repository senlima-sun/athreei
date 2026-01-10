import { useState, useEffect, useCallback } from "react"
import { useApp } from "ink"
import { getApiClient, ApiError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import type { Endpoint } from "../types/api.js"

interface EndpointListResponse {
  data: Endpoint[]
}

export interface UseEndpointsOptions {
  endpointId?: string
  exitOnError?: boolean
}

export interface UseEndpointsResult {
  endpoints: Endpoint[]
  selectedEndpoint: string | null
  setSelectedEndpoint: (id: string) => void
  loading: boolean
  error: Error | ApiError | null
}

export function useEndpoints({
  endpointId,
  exitOnError = true,
}: UseEndpointsOptions = {}): UseEndpointsResult {
  const { exit } = useApp()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(
    endpointId ?? null
  )
  const [loading, setLoading] = useState(!endpointId)
  const [error, setError] = useState<Error | ApiError | null>(null)

  useEffect(() => {
    if (endpointId) return

    async function loadEndpoints() {
      const store = createCredentialStore()
      const orgId = await store.getActiveOrg()

      if (!orgId) {
        setError(
          new Error("No organization selected. Run: athreei org switch <name>")
        )
        setLoading(false)
        if (exitOnError) {
          setTimeout(() => exit(), 100)
        }
        return
      }

      try {
        const client = getApiClient()
        const data = await client.get<EndpointListResponse>(
          `/api/endpoints?organizationId=${orgId}`
        )
        setEndpoints(data.data)

        if (data.data.length === 0) {
          setError(new Error("No endpoints found. Create an endpoint first."))
          if (exitOnError) {
            setTimeout(() => exit(), 100)
          }
        } else if (data.data.length === 1) {
          setSelectedEndpoint(data.data[0].id)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch endpoints")
        )
        if (exitOnError) {
          setTimeout(() => exit(), 100)
        }
      }

      setLoading(false)
    }

    loadEndpoints()
  }, [exit, endpointId, exitOnError])

  const handleSetSelectedEndpoint = useCallback((id: string) => {
    setSelectedEndpoint(id)
  }, [])

  return {
    endpoints,
    selectedEndpoint,
    setSelectedEndpoint: handleSetSelectedEndpoint,
    loading,
    error,
  }
}
