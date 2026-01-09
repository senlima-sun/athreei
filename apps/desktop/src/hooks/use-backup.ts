import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { ImportStrategy } from "@/lib/api"

/**
 * Hook for exporting a backup
 */
export function useExportBackup() {
  return useMutation({
    mutationFn: (path: string) => api.backupExport(path),
  })
}

/**
 * Hook for importing a backup
 */
export function useImportBackup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      path,
      strategy,
    }: {
      path: string
      strategy: ImportStrategy
    }) => api.backupImport(path, strategy),
    onSuccess: () => {
      // Invalidate all data queries after import
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
  })
}

/**
 * Hook for getting backup file info
 */
export function useBackupInfo(path: string | null) {
  return useQuery({
    queryKey: ["backup", "info", path],
    queryFn: () => (path ? api.backupInfo(path) : Promise.reject("No path")),
    enabled: !!path,
  })
}
