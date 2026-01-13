//! Context injection module
//!
//! Provides proactive context injection to AI assistants by automatically
//! retrieving and formatting relevant memories based on intent extraction
//! and relevance scoring.

mod budget;
mod format;
mod intent;
mod relevance;

pub use budget::{
    estimate_tokens, select_within_budget, truncate_content, ContextBudget, ScoredMemory,
    DEFAULT_BUDGET,
};
pub use format::{format_as_json, format_as_markdown, format_as_plain, format_context, ContextFormat};
pub use intent::{clean_meta_phrases, extract_intent, extract_keywords, Intent};
pub use relevance::{
    compute_relevance, normalize_access_frequency, recency_decay, RelevanceScore, RelevanceWeights,
    DEFAULT_WEIGHTS,
};
