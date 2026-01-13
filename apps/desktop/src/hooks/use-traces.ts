import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

/**
 * Query trace analytics for a given time range
 */
export function useTraceAnalytics(days?: number) {
  return useQuery({
    queryKey: queryKeys.traces.analytics(days),
    queryFn: () => api.getTraceAnalytics(days),
    staleTime: 60000,
  })
}

/**
 * Query recent sessions with pagination
 */
export function useRecentSessions(limit?: number, offset?: number) {
  return useQuery({
    queryKey: queryKeys.traces.sessions(limit, offset),
    queryFn: () => api.getRecentSessions(limit, offset),
    staleTime: 30000,
  })
}

/**
 * Query session summary
 */
export function useSessionSummary(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.traces.session(sessionId),
    queryFn: () => api.getSessionSummary(sessionId),
    enabled: !!sessionId,
  })
}

/**
 * Query traces for a specific session
 */
export function useSessionTraces(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.traces.sessionTraces(sessionId),
    queryFn: () => api.getSessionTraces(sessionId),
    enabled: !!sessionId,
  })
}

/**
 * Mutation to cleanup old traces
 */
export function useCleanupTraces() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (retentionDays?: number) => api.cleanupTraces(retentionDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.traces.all })
    },
  })
}
