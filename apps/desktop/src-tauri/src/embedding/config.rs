//! Model configuration and paths

use std::path::PathBuf;

/// Configuration for an embedding model
#[derive(Debug, Clone)]
pub struct ModelConfig {
    pub name: &'static str,
    pub onnx_url: &'static str,
    pub tokenizer_url: &'static str,
    pub dimensions: usize,
    pub max_tokens: usize,
}

/// Default multilingual model: paraphrase-multilingual-MiniLM-L12-v2
/// - 384 dimensions
/// - ~118MB ONNX model
/// - Supports 50+ languages including Chinese and English
pub const DEFAULT_MODEL: ModelConfig = ModelConfig {
    name: "paraphrase-multilingual-MiniLM-L12-v2",
    onnx_url: "https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/onnx/model.onnx",
    tokenizer_url: "https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/tokenizer.json",
    dimensions: 384,
    max_tokens: 128,
};

/// Get the directory where models are stored
pub fn models_dir(app_data_dir: &std::path::Path) -> PathBuf {
    app_data_dir.join("models")
}

/// Get the path for a specific model's ONNX file
pub fn model_onnx_path(app_data_dir: &std::path::Path, model_name: &str) -> PathBuf {
    models_dir(app_data_dir).join(model_name).join("model.onnx")
}

/// Get the path for a specific model's tokenizer file
pub fn tokenizer_path(app_data_dir: &std::path::Path, model_name: &str) -> PathBuf {
    models_dir(app_data_dir).join(model_name).join("tokenizer.json")
}

/// Get the model directory for a specific model
pub fn model_dir(app_data_dir: &std::path::Path, model_name: &str) -> PathBuf {
    models_dir(app_data_dir).join(model_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_model_config() {
        assert_eq!(DEFAULT_MODEL.dimensions, 384);
        assert_eq!(DEFAULT_MODEL.max_tokens, 128);
        assert!(!DEFAULT_MODEL.onnx_url.is_empty());
        assert!(!DEFAULT_MODEL.tokenizer_url.is_empty());
    }

    #[test]
    fn test_model_paths() {
        let app_dir = std::path::Path::new("/tmp/test");
        let onnx = model_onnx_path(app_dir, "test-model");
        let tok = tokenizer_path(app_dir, "test-model");

        assert!(onnx.to_string_lossy().contains("test-model"));
        assert!(onnx.to_string_lossy().contains("model.onnx"));
        assert!(tok.to_string_lossy().contains("tokenizer.json"));
    }
}
