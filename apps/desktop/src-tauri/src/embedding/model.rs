//! Embedding model loading and inference

use crate::embedding::config::{model_onnx_path, tokenizer_path, DEFAULT_MODEL};
use ort::session::Session;
use ort::value::Tensor;
use std::path::Path;
use std::sync::{Arc, Mutex, OnceLock};
use tokenizers::Tokenizer;

/// Global model instance (lazy initialized)
static MODEL: OnceLock<Arc<EmbeddingModel>> = OnceLock::new();

/// Get the global embedding model instance
pub fn get_model() -> Option<Arc<EmbeddingModel>> {
    MODEL.get().cloned()
}

/// Initialize the global embedding model
pub fn init_model(app_data_dir: &Path) -> Result<(), ModelError> {
    if MODEL.get().is_some() {
        return Ok(());
    }

    let model = EmbeddingModel::load(app_data_dir)?;
    let _ = MODEL.set(Arc::new(model));
    Ok(())
}

/// Embedding model with ONNX session and tokenizer
pub struct EmbeddingModel {
    session: Mutex<Session>,
    tokenizer: Tokenizer,
    dimensions: usize,
    max_tokens: usize,
    name: String,
}

impl EmbeddingModel {
    /// Load the model from disk
    pub fn load(app_data_dir: &Path) -> Result<Self, ModelError> {
        let onnx_path = model_onnx_path(app_data_dir, DEFAULT_MODEL.name);
        let tok_path = tokenizer_path(app_data_dir, DEFAULT_MODEL.name);

        if !onnx_path.exists() {
            return Err(ModelError::NotDownloaded);
        }
        if !tok_path.exists() {
            return Err(ModelError::NotDownloaded);
        }

        let session = Session::builder()
            .map_err(|e| ModelError::OrtError(e.to_string()))?
            .with_intra_threads(4)
            .map_err(|e| ModelError::OrtError(e.to_string()))?
            .commit_from_file(&onnx_path)
            .map_err(|e| ModelError::OrtError(e.to_string()))?;

        let tokenizer =
            Tokenizer::from_file(&tok_path).map_err(|e| ModelError::TokenizerError(e.to_string()))?;

        Ok(Self {
            session: Mutex::new(session),
            tokenizer,
            dimensions: DEFAULT_MODEL.dimensions,
            max_tokens: DEFAULT_MODEL.max_tokens,
            name: DEFAULT_MODEL.name.to_string(),
        })
    }

    /// Get the model name
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Get the embedding dimensions
    pub fn dimensions(&self) -> usize {
        self.dimensions
    }

    /// Encode text into an embedding vector
    pub fn encode(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        let encoding = self
            .tokenizer
            .encode(text, true)
            .map_err(|e| ModelError::TokenizerError(e.to_string()))?;

        let mut input_ids: Vec<i32> = encoding.get_ids().iter().map(|&x| x as i32).collect();
        let mut attention_mask: Vec<i32> = encoding.get_attention_mask().iter().map(|&x| x as i32).collect();
        let mut token_type_ids: Vec<i32> = encoding.get_type_ids().iter().map(|&x| x as i32).collect();

        // Truncate if too long
        if input_ids.len() > self.max_tokens {
            input_ids.truncate(self.max_tokens);
            attention_mask.truncate(self.max_tokens);
            token_type_ids.truncate(self.max_tokens);
        }

        let seq_len = input_ids.len();

        let shape = vec![1i64, seq_len as i64];

        let session_inputs = ort::inputs![
            "input_ids" => Tensor::from_array((shape.clone(), input_ids)).map_err(|e| ModelError::InferenceError(e.to_string()))?,
            "attention_mask" => Tensor::from_array((shape.clone(), attention_mask.clone())).map_err(|e| ModelError::InferenceError(e.to_string()))?,
            "token_type_ids" => Tensor::from_array((shape.clone(), token_type_ids)).map_err(|e| ModelError::InferenceError(e.to_string()))?,
        ];

        let mut session = self
            .session
            .lock()
            .map_err(|e| ModelError::InferenceError(format!("Failed to lock session: {}", e)))?;

        let outputs = session
            .run(session_inputs)
            .map_err(|e| ModelError::InferenceError(e.to_string()))?;

        // Get the first output (last hidden state)
        let (_, output_value) = outputs
            .iter()
            .next()
            .ok_or_else(|| ModelError::InferenceError("No output tensor".to_string()))?;

        let (output_shape, output_slice) = output_value
            .try_extract_tensor::<f32>()
            .map_err(|e| ModelError::InferenceError(e.to_string()))?;

        let shape_vec: Vec<usize> = output_shape.iter().map(|&d| d as usize).collect();

        // Mean pooling with attention mask
        let embedding = mean_pooling(output_slice, &attention_mask, &shape_vec)?;
        let normalized = normalize(&embedding);

        Ok(normalized)
    }
}

/// Mean pooling over token embeddings with attention mask weighting
fn mean_pooling(
    hidden_states: &[f32],
    attention_mask: &[i32],
    shape: &[usize],
) -> Result<Vec<f32>, ModelError> {
    if shape.len() != 3 {
        return Err(ModelError::InferenceError(format!(
            "Expected 3D tensor, got {}D",
            shape.len()
        )));
    }

    let seq_len = shape[1];
    let hidden_size = shape[2];

    let mut pooled = vec![0.0f32; hidden_size];
    let mut total_weight = 0.0f32;

    for t in 0..seq_len {
        let mask = attention_mask.get(t).copied().unwrap_or(0) as f32;
        if mask > 0.0 {
            for h in 0..hidden_size {
                let idx = t * hidden_size + h;
                if let Some(&val) = hidden_states.get(idx) {
                    pooled[h] += val * mask;
                }
            }
            total_weight += mask;
        }
    }

    if total_weight > 0.0 {
        for v in pooled.iter_mut() {
            *v /= total_weight;
        }
    }

    Ok(pooled)
}

/// L2 normalize a vector
fn normalize(embedding: &[f32]) -> Vec<f32> {
    let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        embedding.iter().map(|x| x / norm).collect()
    } else {
        embedding.to_vec()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("Model not downloaded")]
    NotDownloaded,
    #[error("ONNX Runtime error: {0}")]
    OrtError(String),
    #[error("Tokenizer error: {0}")]
    TokenizerError(String),
    #[error("Inference error: {0}")]
    InferenceError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize() {
        let vec = vec![3.0, 4.0];
        let normalized = normalize(&vec);
        assert!((normalized[0] - 0.6).abs() < 0.001);
        assert!((normalized[1] - 0.8).abs() < 0.001);
    }

    #[test]
    fn test_normalize_zero_vector() {
        let vec = vec![0.0, 0.0, 0.0];
        let normalized = normalize(&vec);
        assert_eq!(normalized, vec);
    }
}
