/**
 * React Query hooks for MCP server operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import * as api from "@/lib/api"

/**
 * Hook to get MCP server status
 *
 * Polls every 5 seconds when server is running
 */
export function useMcpStatus() {
  return useQuery({
    queryKey: ["mcp", "status"],
    queryFn: api.mcpStatus,
    refetchInterval: (data) => (data?.state.data?.running ? 5000 : false),
  })
}

/**
 * Hook to start the MCP server
 */
export function useMcpStart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.mcpStart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "status"] })
    },
  })
}

/**
 * Hook to stop the MCP server
 */
export function useMcpStop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.mcpStop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "status"] })
    },
  })
}
