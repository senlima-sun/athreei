//! Model download functionality

use crate::embedding::config::{model_dir, model_onnx_path, tokenizer_path, DEFAULT_MODEL};
use std::io::Write;
use std::path::Path;
use std::sync::Arc;

/// Check if the default model is downloaded
pub fn is_model_downloaded(app_data_dir: &Path) -> bool {
    let onnx = model_onnx_path(app_data_dir, DEFAULT_MODEL.name);
    let tokenizer = tokenizer_path(app_data_dir, DEFAULT_MODEL.name);
    onnx.exists() && tokenizer.exists()
}

/// Download progress callback type (must be Send + Sync for async)
pub type ProgressCallback = Arc<dyn Fn(u64, u64) + Send + Sync>;

/// Download the default embedding model
///
/// # Arguments
/// * `app_data_dir` - Application data directory
/// * `progress` - Optional callback for download progress (bytes_downloaded, total_bytes)
pub async fn download_model(
    app_data_dir: &Path,
    progress: Option<ProgressCallback>,
) -> Result<(), DownloadError> {
    let dir = model_dir(app_data_dir, DEFAULT_MODEL.name);
    std::fs::create_dir_all(&dir).map_err(|e| DownloadError::Io(e.to_string()))?;

    download_file(
        DEFAULT_MODEL.onnx_url,
        &model_onnx_path(app_data_dir, DEFAULT_MODEL.name),
        progress.clone(),
    )
    .await?;

    download_file(
        DEFAULT_MODEL.tokenizer_url,
        &tokenizer_path(app_data_dir, DEFAULT_MODEL.name),
        None,
    )
    .await?;

    Ok(())
}

async fn download_file(
    url: &str,
    dest: &Path,
    progress: Option<ProgressCallback>,
) -> Result<(), DownloadError> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| DownloadError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(DownloadError::Network(format!(
            "HTTP {} for {}",
            response.status(),
            url
        )));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut file =
        std::fs::File::create(dest).map_err(|e| DownloadError::Io(format!("{}: {}", dest.display(), e)))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| DownloadError::Network(e.to_string()))?;
        file.write_all(&chunk)
            .map_err(|e| DownloadError::Io(e.to_string()))?;
        downloaded += chunk.len() as u64;
        if let Some(ref cb) = progress {
            cb(downloaded, total_size);
        }
    }

    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum DownloadError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("IO error: {0}")]
    Io(String),
}
