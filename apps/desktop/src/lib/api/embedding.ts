/**
 * Embedding model API functions
 *
 * Provides operations for embedding model management and download.
 */

import { invoke } from "@tauri-apps/api/core"

/**
 * Embedding status returned by the backend
 */
export interface EmbeddingStatus {
  total_memories: number
  with_embeddings: number
  without_embeddings: number
  model_loaded: boolean
  model_name: string | null
}

/**
 * Embedding model configuration
 */
export interface EmbeddingModelConfig {
  name: string
  dimensions: number
  max_tokens: number
}

/**
 * Get embedding model and generation status
 */
export const getEmbeddingStatus = (): Promise<EmbeddingStatus> =>
  invoke("get_embedding_status")

/**
 * Check if the embedding model is downloaded
 */
export const isEmbeddingModelDownloaded = (): Promise<boolean> =>
  invoke("is_embedding_model_downloaded")

/**
 * Download the embedding model
 *
 * Emits "embedding-download-progress" events with { downloaded, total, percent }
 */
export const downloadEmbeddingModel = (): Promise<void> =>
  invoke("download_embedding_model")

/**
 * Initialize the embedding model (if already downloaded)
 */
export const initEmbeddingModel = (): Promise<boolean> =>
  invoke("init_embedding_model")

/**
 * Backfill embeddings for memories that don't have them
 */
export const backfillEmbeddings = (batchSize?: number): Promise<number> =>
  invoke("backfill_memory_embeddings", { batchSize })

/**
 * Get embedding model configuration
 */
export const getEmbeddingModelConfig = (): Promise<EmbeddingModelConfig> =>
  invoke("get_embedding_model_config")
