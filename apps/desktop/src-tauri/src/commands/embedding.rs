//! Embedding-related Tauri commands

use crate::embedding::{
    backfill_embeddings, count_embeddings, download_model, get_model, init_model,
    is_model_downloaded, EmbeddingStatus, DEFAULT_MODEL,
};
use crate::state::DatabaseState;
use std::sync::Arc;
use tauri::{Emitter, Manager, State, Window};

/// Get embedding model and generation status
#[tauri::command]
pub async fn get_embedding_status(db: State<'_, Arc<DatabaseState>>) -> Result<EmbeddingStatus, String> {
    let db_guard = db.db.lock().map_err(|e| e.to_string())?;

    let total_memories: i64 = db_guard
        .connection()
        .query_row("SELECT COUNT(*) FROM memories", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let with_embeddings = count_embeddings(&db_guard).map_err(|e| e.to_string())?;

    let model = get_model();

    Ok(EmbeddingStatus {
        total_memories,
        with_embeddings,
        without_embeddings: total_memories - with_embeddings,
        model_loaded: model.is_some(),
        model_name: model.map(|m| m.name().to_string()),
    })
}

/// Check if embedding model is downloaded
#[tauri::command]
pub async fn is_embedding_model_downloaded(window: Window) -> Result<bool, String> {
    let app_dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    Ok(is_model_downloaded(&app_dir))
}

/// Download the embedding model with progress events
#[tauri::command]
pub async fn download_embedding_model(window: Window) -> Result<(), String> {
    let app_dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let window_clone = window.clone();
    let progress_callback = std::sync::Arc::new(move |downloaded: u64, total: u64| {
        let _ = window_clone.emit(
            "embedding-download-progress",
            serde_json::json!({
                "downloaded": downloaded,
                "total": total,
                "percent": if total > 0 { (downloaded as f64 / total as f64 * 100.0) as u32 } else { 0 }
            }),
        );
    });

    download_model(&app_dir, Some(progress_callback))
        .await
        .map_err(|e| e.to_string())?;

    // Initialize the model after download
    init_model(&app_dir).map_err(|e| e.to_string())?;

    Ok(())
}

/// Initialize the embedding model (if downloaded)
#[tauri::command]
pub async fn init_embedding_model(window: Window) -> Result<bool, String> {
    let app_dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    if !is_model_downloaded(&app_dir) {
        return Ok(false);
    }

    init_model(&app_dir).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Backfill embeddings for memories that don't have them
#[tauri::command]
pub async fn backfill_memory_embeddings(
    db: State<'_, Arc<DatabaseState>>,
    batch_size: Option<usize>,
) -> Result<usize, String> {
    let db_guard = db.db.lock().map_err(|e| e.to_string())?;
    let size = batch_size.unwrap_or(100);

    backfill_embeddings(&db_guard, size).map_err(|e| e.to_string())
}

/// Get embedding model configuration
#[tauri::command]
pub async fn get_embedding_model_config() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "name": DEFAULT_MODEL.name,
        "dimensions": DEFAULT_MODEL.dimensions,
        "max_tokens": DEFAULT_MODEL.max_tokens,
    }))
}
