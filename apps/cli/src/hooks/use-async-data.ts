import { useState, useEffect, useCallback } from "react"
import { useApp } from "ink"
import type { ApiError } from "../lib/api"

export interface UseAsyncDataOptions<T> {
  fetcher: () => Promise<T>
  exitOnComplete?: boolean
  exitOnError?: boolean
  exitDelay?: number
}

export interface UseAsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: Error | ApiError | null
  refetch: () => void
}

export function useAsyncData<T>({
  fetcher,
  exitOnComplete = true,
  exitOnError = true,
  exitDelay = 100,
}: UseAsyncDataOptions<T>): UseAsyncDataResult<T> {
  const { exit } = useApp()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | ApiError | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      if (exitOnComplete) {
        setTimeout(() => exit(), exitDelay)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      if (exitOnError) {
        setTimeout(() => exit(), exitDelay)
      }
    } finally {
      setLoading(false)
    }
  }, [fetcher, exit, exitOnComplete, exitOnError, exitDelay])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
