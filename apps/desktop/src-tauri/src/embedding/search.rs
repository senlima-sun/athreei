//! Hybrid search combining FTS5 and vector similarity using RRF

use crate::embedding::db::{search_vector, DbError};
use crate::embedding::model::{get_model, ModelError};
use crate::storage::Database;
use std::collections::HashMap;

/// Search result with combined ranking information
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub memory_id: String,
    pub score: f64,
    pub fts_rank: Option<usize>,
    pub vec_rank: Option<usize>,
}

/// RRF constant (default k=60 from original paper)
const RRF_K: f64 = 60.0;

/// Compute RRF score for a given rank
fn rrf_score(rank: usize) -> f64 {
    1.0 / (RRF_K + rank as f64)
}

/// Merge two ranked lists using Reciprocal Rank Fusion
pub fn rrf_merge(
    fts_results: &[(String, usize)],
    vec_results: &[(String, usize)],
) -> Vec<SearchResult> {
    let mut scores: HashMap<String, SearchResult> = HashMap::new();

    for (id, rank) in fts_results {
        let rrf = rrf_score(*rank);
        scores
            .entry(id.clone())
            .and_modify(|r| {
                r.score += rrf;
                r.fts_rank = Some(*rank);
            })
            .or_insert(SearchResult {
                memory_id: id.clone(),
                score: rrf,
                fts_rank: Some(*rank),
                vec_rank: None,
            });
    }

    for (id, rank) in vec_results {
        let rrf = rrf_score(*rank);
        scores
            .entry(id.clone())
            .and_modify(|r| {
                r.score += rrf;
                r.vec_rank = Some(*rank);
            })
            .or_insert(SearchResult {
                memory_id: id.clone(),
                score: rrf,
                fts_rank: None,
                vec_rank: Some(*rank),
            });
    }

    let mut results: Vec<SearchResult> = scores.into_values().collect();
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// Perform hybrid search combining FTS5 and vector similarity
pub fn search_hybrid(
    db: &Database,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResult>, SearchError> {
    let fts_limit = limit * 2;
    let vec_limit = limit * 2;

    // FTS5 search
    let fts_results = search_fts(db, query, fts_limit)?;
    let fts_ranked: Vec<(String, usize)> = fts_results
        .into_iter()
        .enumerate()
        .map(|(i, id)| (id, i + 1))
        .collect();

    // Vector search (if model available)
    let vec_ranked: Vec<(String, usize)> = if let Some(model) = get_model() {
        match model.encode(query) {
            Ok(embedding) => {
                let vec_results = search_vector(db, &embedding, vec_limit)
                    .map_err(SearchError::DbError)?;
                vec_results
                    .into_iter()
                    .enumerate()
                    .map(|(i, (id, _))| (id, i + 1))
                    .collect()
            }
            Err(_) => vec![],
        }
    } else {
        vec![]
    };

    let mut merged = rrf_merge(&fts_ranked, &vec_ranked);
    merged.truncate(limit);

    Ok(merged)
}

/// Perform FTS5-only search
fn search_fts(db: &Database, query: &str, limit: usize) -> Result<Vec<String>, SearchError> {
    let conn = db.connection();

    // Escape special FTS5 characters and add prefix matching
    let escaped_query = escape_fts_query(query);

    let mut stmt = conn
        .prepare(
            "SELECT memory_id FROM memories_fts
             WHERE memories_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2",
        )
        .map_err(|e| SearchError::DbError(DbError::SqliteError(e.to_string())))?;

    let results = stmt
        .query_map(rusqlite::params![escaped_query, limit as i64], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|e| SearchError::DbError(DbError::SqliteError(e.to_string())))?;

    let mut ids = Vec::new();
    for result in results {
        ids.push(result.map_err(|e| SearchError::DbError(DbError::SqliteError(e.to_string())))?);
    }

    Ok(ids)
}

/// Escape FTS5 query and add prefix matching
fn escape_fts_query(query: &str) -> String {
    let tokens: Vec<&str> = query.split_whitespace().collect();
    if tokens.is_empty() {
        return String::new();
    }

    tokens
        .iter()
        .map(|t| {
            // Escape quotes and add prefix matching
            let escaped = t.replace('"', "\"\"");
            format!("\"{}\"*", escaped)
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("Database error: {0}")]
    DbError(#[from] DbError),
    #[error("Model error: {0}")]
    ModelError(#[from] ModelError),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rrf_score() {
        let score1 = rrf_score(1);
        let score2 = rrf_score(2);
        assert!(score1 > score2);
    }

    #[test]
    fn test_rrf_merge_single_source() {
        let fts = vec![("a".to_string(), 1), ("b".to_string(), 2)];
        let vec: Vec<(String, usize)> = vec![];

        let results = rrf_merge(&fts, &vec);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].memory_id, "a");
        assert!(results[0].fts_rank.is_some());
        assert!(results[0].vec_rank.is_none());
    }

    #[test]
    fn test_rrf_merge_both_sources() {
        let fts = vec![("a".to_string(), 1), ("b".to_string(), 2)];
        let vec = vec![("b".to_string(), 1), ("c".to_string(), 2)];

        let results = rrf_merge(&fts, &vec);
        // "b" appears in both, should have highest score
        assert_eq!(results[0].memory_id, "b");
        assert!(results[0].fts_rank.is_some());
        assert!(results[0].vec_rank.is_some());
    }

    #[test]
    fn test_escape_fts_query() {
        assert_eq!(escape_fts_query("hello world"), "\"hello\"* \"world\"*");
        assert_eq!(escape_fts_query("single"), "\"single\"*");
        assert_eq!(escape_fts_query(""), "");
    }

    #[test]
    fn test_escape_fts_query_with_quotes() {
        let result = escape_fts_query("hello\"world");
        assert!(result.contains("\"\""));
    }
}
