//! Background embedding generation

use crate::embedding::db::{get_memories_without_embeddings, insert_embedding, DbError};
use crate::embedding::model::{get_model, ModelError};
use crate::storage::Database;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Status of background embedding generation
#[derive(Debug, Clone, serde::Serialize)]
pub struct EmbeddingStatus {
    pub total_memories: i64,
    pub with_embeddings: i64,
    pub without_embeddings: i64,
    pub model_loaded: bool,
    pub model_name: Option<String>,
}

/// Generate embedding for a single memory in the background
pub fn generate_embedding_for_memory(
    db: Arc<Mutex<Database>>,
    memory_id: String,
    content: String,
) {
    tokio::spawn(async move {
        if let Some(model) = get_model() {
            match model.encode(&content) {
                Ok(embedding) => {
                    let db_guard = db.lock().await;
                    if let Err(e) = insert_embedding(&db_guard, &memory_id, &embedding, model.name())
                    {
                        eprintln!("Failed to insert embedding for {}: {}", memory_id, e);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to encode memory {}: {}", memory_id, e);
                }
            }
        }
    });
}

/// Backfill embeddings for memories that don't have them
pub fn backfill_embeddings(db: &Database, batch_size: usize) -> Result<usize, BackfillError> {
    let model = get_model().ok_or(BackfillError::ModelNotLoaded)?;

    let memory_ids = get_memories_without_embeddings(db, batch_size)?;

    if memory_ids.is_empty() {
        return Ok(0);
    }

    let mut processed = 0;

    for memory_id in memory_ids {
        // Get memory content (we need to fetch it from the database)
        let content = get_memory_content(db, &memory_id)?;

        if let Some(text) = content {
            match model.encode(&text) {
                Ok(embedding) => {
                    insert_embedding(db, &memory_id, &embedding, model.name())?;
                    processed += 1;
                }
                Err(e) => {
                    eprintln!("Failed to encode memory {}: {}", memory_id, e);
                }
            }
        }
    }

    Ok(processed)
}

fn get_memory_content(db: &Database, memory_id: &str) -> Result<Option<String>, BackfillError> {
    let conn = db.connection();

    // Get the summary_standard or summary_brief as the content to embed
    // We use unencrypted summaries since they're available for search
    let result: Option<String> = conn
        .query_row(
            "SELECT COALESCE(summary_standard, summary_brief, summary_title, source_id, source)
             FROM memories WHERE id = ?1",
            rusqlite::params![memory_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| BackfillError::DbError(DbError::SqliteError(e.to_string())))?;

    Ok(result)
}

#[derive(Debug, thiserror::Error)]
pub enum BackfillError {
    #[error("Model not loaded")]
    ModelNotLoaded,
    #[error("Model error: {0}")]
    ModelError(#[from] ModelError),
    #[error("Database error: {0}")]
    DbError(#[from] DbError),
}

trait OptionalExt<T> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalExt<T> for Result<T, rusqlite::Error> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
