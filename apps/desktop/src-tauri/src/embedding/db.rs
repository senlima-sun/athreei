//! Vector database operations using sqlite-vec

use crate::storage::Database;
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

/// Insert or update an embedding for a memory
pub fn insert_embedding(
    db: &Database,
    memory_id: &str,
    embedding: &[f32],
    model_name: &str,
) -> Result<(), DbError> {
    let conn = db.connection();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let blob = embedding_to_blob(embedding);

    conn.execute(
        "INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding, model_name, dimensions, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![memory_id, blob, model_name, embedding.len() as i32, now],
    )
    .map_err(|e| DbError::SqliteError(e.to_string()))?;

    Ok(())
}

/// Get embedding for a memory
pub fn get_embedding(db: &Database, memory_id: &str) -> Result<Option<Vec<f32>>, DbError> {
    let conn = db.connection();

    let result: Option<Vec<u8>> = conn
        .query_row(
            "SELECT embedding FROM memory_embeddings WHERE memory_id = ?1",
            params![memory_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| DbError::SqliteError(e.to_string()))?;

    Ok(result.map(|blob| blob_to_embedding(&blob)))
}

/// Delete embedding for a memory
pub fn delete_embedding(db: &Database, memory_id: &str) -> Result<(), DbError> {
    let conn = db.connection();

    conn.execute(
        "DELETE FROM memory_embeddings WHERE memory_id = ?1",
        params![memory_id],
    )
    .map_err(|e| DbError::SqliteError(e.to_string()))?;

    Ok(())
}

/// Search for similar memories using vector similarity
///
/// Returns (memory_id, distance) pairs sorted by distance ascending
pub fn search_vector(
    db: &Database,
    query_embedding: &[f32],
    limit: usize,
) -> Result<Vec<(String, f32)>, DbError> {
    let conn = db.connection();
    let blob = embedding_to_blob(query_embedding);

    let mut stmt = conn
        .prepare(
            "SELECT memory_id, distance
             FROM memories_vec
             WHERE embedding MATCH ?1
             ORDER BY distance
             LIMIT ?2",
        )
        .map_err(|e| DbError::SqliteError(e.to_string()))?;

    let results = stmt
        .query_map(params![blob, limit as i64], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f32>(1)?))
        })
        .map_err(|e| DbError::SqliteError(e.to_string()))?;

    let mut vec_results = Vec::new();
    for result in results {
        vec_results.push(result.map_err(|e| DbError::SqliteError(e.to_string()))?);
    }

    Ok(vec_results)
}

/// Convert f32 embedding to blob for sqlite-vec
fn embedding_to_blob(embedding: &[f32]) -> Vec<u8> {
    embedding
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect()
}

/// Convert blob back to f32 embedding
fn blob_to_embedding(blob: &[u8]) -> Vec<f32> {
    blob.chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}

/// Get memory IDs that don't have embeddings
pub fn get_memories_without_embeddings(
    db: &Database,
    limit: usize,
) -> Result<Vec<String>, DbError> {
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT m.id FROM memories m
             LEFT JOIN memory_embeddings e ON m.id = e.memory_id
             WHERE e.memory_id IS NULL
             LIMIT ?1",
        )
        .map_err(|e| DbError::SqliteError(e.to_string()))?;

    let results = stmt
        .query_map(params![limit as i64], |row| row.get::<_, String>(0))
        .map_err(|e| DbError::SqliteError(e.to_string()))?;

    let mut ids = Vec::new();
    for result in results {
        ids.push(result.map_err(|e| DbError::SqliteError(e.to_string()))?);
    }

    Ok(ids)
}

/// Count memories that have embeddings
pub fn count_embeddings(db: &Database) -> Result<i64, DbError> {
    let conn = db.connection();

    conn.query_row("SELECT COUNT(*) FROM memory_embeddings", [], |row| {
        row.get(0)
    })
    .map_err(|e| DbError::SqliteError(e.to_string()))
}

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    SqliteError(String),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_blob_roundtrip() {
        let embedding = vec![1.0f32, 2.0, 3.0, -4.5, 0.001];
        let blob = embedding_to_blob(&embedding);
        let recovered = blob_to_embedding(&blob);
        assert_eq!(embedding, recovered);
    }

    #[test]
    fn test_empty_embedding() {
        let embedding: Vec<f32> = vec![];
        let blob = embedding_to_blob(&embedding);
        let recovered = blob_to_embedding(&blob);
        assert!(recovered.is_empty());
    }
}
