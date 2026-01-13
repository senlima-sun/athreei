//! Intent extraction for context injection
//!
//! Extracts searchable intent from user prompts by removing conversational
//! fluff and identifying meaningful keywords for memory retrieval.

use serde::{Deserialize, Serialize};

const META_PHRASES: &[&str] = &[
    "can you",
    "could you",
    "would you",
    "will you",
    "please help me",
    "please help",
    "help me",
    "i want to",
    "i need to",
    "i would like to",
    "i'd like to",
    "how do i",
    "how can i",
    "how to",
    "what is",
    "what are",
    "show me",
    "find me",
    "tell me",
    "let me know",
    "i wonder",
    "wondering about",
    "i'm trying to",
    "trying to",
    "i am looking for",
    "looking for",
    "do you know",
    "is there",
    "are there",
    "give me",
];

const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it",
    "its", "of", "on", "or", "that", "the", "to", "was", "were", "will", "with", "this", "but",
    "they", "have", "had", "what", "when", "where", "who", "which", "how", "can", "could", "would",
    "should", "may", "might", "must", "do", "does", "did", "been", "being", "if", "so", "than",
    "then", "there", "these", "those", "we", "you", "your", "our", "their", "my", "me", "him",
    "her", "them", "us", "i", "not", "no", "just", "only", "also", "about", "into", "more",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    pub raw: String,
    pub cleaned: String,
    pub keywords: Vec<String>,
    pub confidence: f64,
}

impl Default for Intent {
    fn default() -> Self {
        Self {
            raw: String::new(),
            cleaned: String::new(),
            keywords: Vec::new(),
            confidence: 0.0,
        }
    }
}

pub fn clean_meta_phrases(text: &str) -> String {
    let mut result = text.to_lowercase();

    for phrase in META_PHRASES {
        result = result.replace(phrase, " ");
    }

    result
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn is_stop_word(word: &str) -> bool {
    STOP_WORDS.contains(&word.to_lowercase().as_str())
}

pub fn extract_keywords(text: &str) -> Vec<String> {
    let words: Vec<String> = text
        .to_lowercase()
        .split(|c: char| c.is_whitespace() || c.is_ascii_punctuation())
        .filter(|w| !w.is_empty() && w.len() > 2 && !is_stop_word(w))
        .map(String::from)
        .collect();

    let mut unique = Vec::new();
    for word in words {
        if !unique.contains(&word) {
            unique.push(word);
        }
    }

    unique
}

pub fn extract_intent(text: &str) -> Intent {
    let raw = text.to_string();
    let trimmed = text.trim();

    if trimmed.is_empty() {
        return Intent::default();
    }

    let cleaned = clean_meta_phrases(trimmed);
    let keywords = extract_keywords(&cleaned);

    let original_len = trimmed.chars().filter(|c| !c.is_whitespace()).count() as f64;
    let cleaned_len = cleaned.chars().filter(|c| !c.is_whitespace()).count() as f64;

    let content_ratio = if original_len > 0.0 {
        (cleaned_len / original_len).clamp(0.0, 1.0)
    } else {
        0.0
    };

    let keyword_signal = (keywords.len().min(10) as f64 / 10.0).clamp(0.0, 1.0);

    let confidence = (content_ratio * 0.6 + keyword_signal * 0.4).clamp(0.0, 1.0);

    Intent {
        raw,
        cleaned,
        keywords,
        confidence,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_meta_phrases_basic() {
        let text = "Can you help me find information about Rust programming?";
        let cleaned = clean_meta_phrases(text);
        assert!(!cleaned.contains("can you"));
        assert!(!cleaned.contains("help me"));
        assert!(cleaned.contains("information"));
        assert!(cleaned.contains("rust"));
    }

    #[test]
    fn test_clean_meta_phrases_multiple() {
        let text = "I want to know how do I implement this feature";
        let cleaned = clean_meta_phrases(text);
        assert!(!cleaned.contains("i want to"));
        assert!(!cleaned.contains("how do i"));
        assert!(cleaned.contains("know"));
        assert!(cleaned.contains("implement"));
    }

    #[test]
    fn test_clean_meta_phrases_case_insensitive() {
        let text = "CAN YOU PLEASE HELP ME with this task?";
        let cleaned = clean_meta_phrases(text);
        assert!(!cleaned.contains("can you"));
        assert!(!cleaned.contains("please help me"));
    }

    #[test]
    fn test_extract_keywords_basic() {
        let text = "rust programming memory management";
        let keywords = extract_keywords(text);
        assert!(keywords.contains(&"rust".to_string()));
        assert!(keywords.contains(&"programming".to_string()));
        assert!(keywords.contains(&"memory".to_string()));
        assert!(keywords.contains(&"management".to_string()));
    }

    #[test]
    fn test_extract_keywords_filters_stop_words() {
        let text = "the quick brown fox jumps over the lazy dog";
        let keywords = extract_keywords(text);
        assert!(!keywords.contains(&"the".to_string()));
        assert!(keywords.contains(&"quick".to_string()));
        assert!(keywords.contains(&"brown".to_string()));
        assert!(keywords.contains(&"fox".to_string()));
        assert!(keywords.contains(&"jumps".to_string()));
        assert!(keywords.contains(&"over".to_string()));
        assert!(keywords.contains(&"lazy".to_string()));
    }

    #[test]
    fn test_extract_keywords_filters_short_words() {
        let text = "I am a programmer who is nice";
        let keywords = extract_keywords(text);
        assert!(!keywords.contains(&"am".to_string()));
        assert!(keywords.contains(&"programmer".to_string()));
        assert!(keywords.contains(&"nice".to_string()));
    }

    #[test]
    fn test_extract_keywords_handles_punctuation() {
        let text = "Hello, world! This is a test.";
        let keywords = extract_keywords(text);
        assert!(keywords.contains(&"hello".to_string()));
        assert!(keywords.contains(&"world".to_string()));
        assert!(keywords.contains(&"test".to_string()));
    }

    #[test]
    fn test_extract_keywords_empty() {
        let keywords = extract_keywords("");
        assert!(keywords.is_empty());
    }

    #[test]
    fn test_extract_keywords_deduplicates() {
        let text = "rust rust rust programming";
        let keywords = extract_keywords(text);
        let rust_count = keywords.iter().filter(|&k| k == "rust").count();
        assert_eq!(rust_count, 1);
    }

    #[test]
    fn test_extract_intent_basic() {
        let text = "Can you help me understand Rust memory management?";
        let intent = extract_intent(text);
        assert!(!intent.cleaned.is_empty());
        assert!(!intent.keywords.is_empty());
        assert!(intent.confidence > 0.0);
        assert!(intent.keywords.contains(&"rust".to_string()));
        assert!(intent.keywords.contains(&"memory".to_string()));
    }

    #[test]
    fn test_extract_intent_empty() {
        let intent = extract_intent("");
        assert!(intent.cleaned.is_empty());
        assert!(intent.keywords.is_empty());
        assert_eq!(intent.confidence, 0.0);
    }

    #[test]
    fn test_extract_intent_meta_only() {
        let text = "Can you please help me";
        let intent = extract_intent(text);
        assert!(intent.keywords.is_empty());
        assert!(intent.confidence < 0.5);
    }

    #[test]
    fn test_extract_intent_high_confidence() {
        let text = "Rust borrow checker lifetime annotations ownership semantics";
        let intent = extract_intent(text);
        assert!(intent.confidence > 0.7);
        assert!(intent.keywords.len() >= 4);
    }

    #[test]
    fn test_intent_default() {
        let intent = Intent::default();
        assert!(intent.raw.is_empty());
        assert!(intent.cleaned.is_empty());
        assert!(intent.keywords.is_empty());
        assert_eq!(intent.confidence, 0.0);
    }
}
