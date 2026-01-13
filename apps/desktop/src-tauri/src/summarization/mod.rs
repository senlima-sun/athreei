//! Memory summarization module
//!
//! Provides multi-level extractive text summarization for memories.
//! Supports both English and Chinese text with automatic language detection.
//!
//! # Summary Levels
//!
//! - **Title**: 5-15 tokens - Quick identification headline
//! - **Brief**: 30-60 tokens - First sentence + key sentence
//! - **Standard**: 100-200 tokens - Top sentences preserving order
//! - **Full**: Original content (no summarization)
//!
//! # Example
//!
//! ```rust,ignore
//! use summarization::{generate_all_summaries, SummaryLevel};
//!
//! let content = "Long document text here...";
//! let summaries = generate_all_summaries(content);
//!
//! // Get specific level
//! if let Some(brief) = summaries.get(SummaryLevel::Brief) {
//!     println!("Brief: {}", brief);
//! }
//! ```

mod generator;
mod hash;
mod scoring;
mod segmentation;
mod tokenize;
mod types;

// Public API
pub use generator::generate_all_summaries;
pub use hash::{content_hash, is_summary_stale};
pub use types::{Summaries, SummaryConfig, SummaryLevel};

// Re-export individual generators for fine-grained control
pub use generator::{generate_brief, generate_standard, generate_title};
