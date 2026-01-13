//! Type definitions for the summarization module
//!
//! Defines summary levels and data structures for multi-level memory summaries.

use serde::{Deserialize, Serialize};

/// Summary level determines the verbosity of the summary returned.
///
/// Each level targets a specific token budget to optimize MCP context usage:
/// - Title: 5-15 tokens - quick identification
/// - Brief: 30-60 tokens - key points overview
/// - Standard: 100-200 tokens - comprehensive summary
/// - Full: Original content (no summarization)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SummaryLevel {
    /// Headline/title, 5-15 tokens
    Title,
    /// First sentence + highest-scored sentence, 30-60 tokens
    Brief,
    /// Top 5-7 sentences preserving order, 100-200 tokens
    Standard,
    /// Original content, no summarization
    Full,
}

impl SummaryLevel {
    /// Parse summary level from a string parameter
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "title" => Some(Self::Title),
            "brief" => Some(Self::Brief),
            "standard" => Some(Self::Standard),
            "full" => Some(Self::Full),
            _ => None,
        }
    }

    /// Convert to string representation for API parameters
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Title => "title",
            Self::Brief => "brief",
            Self::Standard => "standard",
            Self::Full => "full",
        }
    }
}

impl Default for SummaryLevel {
    fn default() -> Self {
        Self::Brief
    }
}

impl std::fmt::Display for SummaryLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Collection of pre-generated summaries at different levels.
///
/// Stored alongside memories for quick retrieval without regeneration.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Summaries {
    /// Short title/headline (5-15 tokens)
    pub title: Option<String>,
    /// Brief overview (30-60 tokens)
    pub brief: Option<String>,
    /// Standard summary (100-200 tokens)
    pub standard: Option<String>,
    /// Version counter, incremented on regeneration
    pub version: u32,
    /// SHA-256 hash of content at generation time (truncated to 16 chars)
    pub content_hash: String,
}

impl Summaries {
    /// Create empty summaries with initial hash
    pub fn new(content_hash: String) -> Self {
        Self {
            title: None,
            brief: None,
            standard: None,
            version: 0,
            content_hash,
        }
    }

    /// Check if any summary level is available
    pub fn has_any(&self) -> bool {
        self.title.is_some() || self.brief.is_some() || self.standard.is_some()
    }

    /// Get summary at the specified level, falling back to next available level
    pub fn get(&self, level: SummaryLevel) -> Option<&String> {
        match level {
            SummaryLevel::Title => self.title.as_ref(),
            SummaryLevel::Brief => self
                .brief
                .as_ref()
                .or(self.standard.as_ref())
                .or(self.title.as_ref()),
            SummaryLevel::Standard => self.standard.as_ref().or(self.brief.as_ref()),
            SummaryLevel::Full => None, // Full returns original content, not stored here
        }
    }
}

/// Configuration for summary generation
#[derive(Debug, Clone)]
pub struct SummaryConfig {
    /// Maximum characters for title summary
    pub title_max_chars: usize,
    /// Maximum characters for brief summary
    pub brief_max_chars: usize,
    /// Maximum characters for standard summary
    pub standard_max_chars: usize,
    /// Position boost decay factor (0.0-1.0)
    pub position_decay: f64,
}

impl Default for SummaryConfig {
    fn default() -> Self {
        Self {
            title_max_chars: 100,     // ~15 tokens
            brief_max_chars: 400,     // ~60 tokens
            standard_max_chars: 1200, // ~200 tokens
            position_decay: 0.9,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_summary_level_from_str() {
        assert_eq!(SummaryLevel::from_str("title"), Some(SummaryLevel::Title));
        assert_eq!(SummaryLevel::from_str("BRIEF"), Some(SummaryLevel::Brief));
        assert_eq!(
            SummaryLevel::from_str("Standard"),
            Some(SummaryLevel::Standard)
        );
        assert_eq!(SummaryLevel::from_str("full"), Some(SummaryLevel::Full));
        assert_eq!(SummaryLevel::from_str("invalid"), None);
    }

    #[test]
    fn test_summary_level_as_str() {
        assert_eq!(SummaryLevel::Title.as_str(), "title");
        assert_eq!(SummaryLevel::Brief.as_str(), "brief");
        assert_eq!(SummaryLevel::Standard.as_str(), "standard");
        assert_eq!(SummaryLevel::Full.as_str(), "full");
    }

    #[test]
    fn test_summaries_get_fallback() {
        let summaries = Summaries {
            title: Some("Title".to_string()),
            brief: None,
            standard: Some("Standard summary".to_string()),
            version: 1,
            content_hash: "abc123".to_string(),
        };

        // Brief falls back to standard when brief is missing
        assert_eq!(
            summaries.get(SummaryLevel::Brief),
            Some(&"Standard summary".to_string())
        );

        // Title returns title
        assert_eq!(
            summaries.get(SummaryLevel::Title),
            Some(&"Title".to_string())
        );

        // Full returns None (original content handled elsewhere)
        assert!(summaries.get(SummaryLevel::Full).is_none());
    }

    #[test]
    fn test_summaries_has_any() {
        let empty = Summaries::default();
        assert!(!empty.has_any());

        let with_title = Summaries {
            title: Some("Title".to_string()),
            ..Default::default()
        };
        assert!(with_title.has_any());
    }
}
