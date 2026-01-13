import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listen } from "@tauri-apps/api/event"
import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

/**
 * Query embedding status (model loaded, embeddings count, etc.)
 */
export function useEmbeddingStatus() {
  return useQuery({
    queryKey: queryKeys.embedding.status,
    queryFn: () => api.getEmbeddingStatus(),
    staleTime: 60000,
  })
}

/**
 * Query if embedding model is downloaded
 */
export function useIsEmbeddingModelDownloaded() {
  return useQuery({
    queryKey: queryKeys.embedding.downloaded,
    queryFn: () => api.isEmbeddingModelDownloaded(),
    staleTime: 30000,
  })
}

/**
 * Query embedding model configuration
 */
export function useEmbeddingModelConfig() {
  return useQuery({
    queryKey: queryKeys.embedding.config,
    queryFn: () => api.getEmbeddingModelConfig(),
    staleTime: Infinity,
  })
}

/**
 * Download progress event payload
 */
interface DownloadProgress {
  downloaded: number
  total: number
  percent: number
}

/**
 * Mutation to download the embedding model with progress tracking
 */
export function useDownloadEmbeddingModel() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<DownloadProgress>({
    downloaded: 0,
    total: 0,
    percent: 0,
  })

  useEffect(() => {
    const unlisten = listen<DownloadProgress>(
      "embedding-download-progress",
      (event) => {
        setProgress(event.payload)
      }
    )

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const mutation = useMutation({
    mutationFn: () => api.downloadEmbeddingModel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.embedding.all })
      setProgress({ downloaded: 0, total: 0, percent: 0 })
    },
    onError: () => {
      setProgress({ downloaded: 0, total: 0, percent: 0 })
    },
  })

  return {
    ...mutation,
    progress,
    isDownloading: mutation.isPending,
  }
}

/**
 * Mutation to initialize the embedding model
 */
export function useInitEmbeddingModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.initEmbeddingModel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.embedding.all })
    },
  })
}

/**
 * Mutation to backfill embeddings for memories
 */
export function useBackfillEmbeddings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchSize?: number) => api.backfillEmbeddings(batchSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.embedding.status })
    },
  })
}
