//! Embedding module for vector search functionality
//!
//! This module provides:
//! - ONNX model loading and inference
//! - Text tokenization for multilingual embeddings
//! - Vector database operations (sqlite-vec)
//! - Hybrid search combining FTS5 and vector similarity (RRF)
//! - Background embedding generation

mod background;
mod config;
mod db;
mod download;
mod model;
mod search;
mod similarity;

pub use background::{backfill_embeddings, generate_embedding_for_memory, EmbeddingStatus};
pub use config::{model_dir, ModelConfig, DEFAULT_MODEL};
pub use db::{count_embeddings, delete_embedding, get_embedding, insert_embedding, search_vector};
pub use download::{download_model, is_model_downloaded, DownloadError};
pub use model::{get_model, init_model, EmbeddingModel, ModelError};
pub use search::{search_hybrid, SearchResult};
pub use similarity::{cosine_distance, cosine_similarity, euclidean_distance};
