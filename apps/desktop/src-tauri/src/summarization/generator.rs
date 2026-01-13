//! Summary generation using extractive methods
//!
//! Generates multi-level summaries by selecting key sentences from content.

use super::hash::content_hash;
use super::scoring::{apply_position_boost, calculate_tf, score_sentences, select_top_sentences};
use super::segmentation::split_sentences;
use super::types::{Summaries, SummaryConfig};

/// Generate a title/headline from content.
///
/// Extracts the first meaningful phrase or first N words.
/// Target: 5-15 tokens (~100 characters).
pub fn generate_title(content: &str, config: &SummaryConfig) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let sentences = split_sentences(trimmed);
    if sentences.is_empty() {
        // No sentence boundaries, take first N characters
        return truncate_at_word_boundary(trimmed, config.title_max_chars);
    }

    // Use first sentence if short enough
    let first = sentences[0];
    if first.len() <= config.title_max_chars {
        return first.to_string();
    }

    // Truncate first sentence at word boundary
    truncate_at_word_boundary(first, config.title_max_chars)
}

/// Generate a brief summary from content.
///
/// Includes first sentence plus highest-scored sentence (if different).
/// Target: 30-60 tokens (~400 characters).
pub fn generate_brief(content: &str, config: &SummaryConfig) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let sentences = split_sentences(trimmed);
    if sentences.is_empty() {
        return truncate_at_word_boundary(trimmed, config.brief_max_chars);
    }

    if sentences.len() == 1 {
        return truncate_at_word_boundary(sentences[0], config.brief_max_chars);
    }

    // Get first sentence
    let first = sentences[0];

    // Find highest-scored sentence (excluding first)
    let tf = calculate_tf(&sentences);
    let mut scores = score_sentences(&sentences, &tf);
    apply_position_boost(&mut scores, config.position_decay, sentences.len());

    // Find best non-first sentence
    let best_other = scores.iter().find(|(idx, _)| *idx != 0).map(|(idx, _)| *idx);

    let mut result = first.to_string();

    if let Some(idx) = best_other {
        if result.len() + sentences[idx].len() + 1 <= config.brief_max_chars {
            result.push(' ');
            result.push_str(sentences[idx]);
        }
    }

    result
}

/// Generate a standard summary from content.
///
/// Selects top 5-7 sentences by score, preserving original order.
/// Target: 100-200 tokens (~1200 characters).
pub fn generate_standard(content: &str, config: &SummaryConfig) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let sentences = split_sentences(trimmed);
    if sentences.is_empty() {
        return truncate_at_word_boundary(trimmed, config.standard_max_chars);
    }

    // For very short content, return as-is
    if sentences.len() <= 3 {
        let full: String = sentences.join(" ");
        return truncate_at_word_boundary(&full, config.standard_max_chars);
    }

    // Score and rank sentences
    let tf = calculate_tf(&sentences);
    let mut scores = score_sentences(&sentences, &tf);
    apply_position_boost(&mut scores, config.position_decay, sentences.len());

    // Select top 5-7 sentences based on content length
    let target_count = calculate_target_sentence_count(sentences.len());
    let selected_indices = select_top_sentences(&scores, target_count);

    // Build summary maintaining original order
    let mut result = String::new();
    let mut current_len = 0;

    for idx in selected_indices {
        let sentence = sentences[idx];
        if current_len + sentence.len() + 1 > config.standard_max_chars {
            break;
        }

        if !result.is_empty() {
            result.push(' ');
            current_len += 1;
        }
        result.push_str(sentence);
        current_len += sentence.len();
    }

    result
}

/// Generate all summary levels at once.
///
/// This is more efficient than generating each level separately
/// as it only splits sentences and calculates TF once.
pub fn generate_all_summaries(content: &str) -> Summaries {
    let config = SummaryConfig::default();
    let hash = content_hash(content);

    let title = generate_title(content, &config);
    let brief = generate_brief(content, &config);
    let standard = generate_standard(content, &config);

    Summaries {
        title: if title.is_empty() { None } else { Some(title) },
        brief: if brief.is_empty() { None } else { Some(brief) },
        standard: if standard.is_empty() {
            None
        } else {
            Some(standard)
        },
        version: 1,
        content_hash: hash,
    }
}

/// Truncate text at a word boundary, adding ellipsis if truncated.
fn truncate_at_word_boundary(text: &str, max_len: usize) -> String {
    if text.len() <= max_len {
        return text.to_string();
    }

    // Find last space before max_len
    let truncate_point = text[..max_len]
        .rfind(|c: char| c.is_whitespace())
        .unwrap_or(max_len);

    let mut result = text[..truncate_point].trim_end().to_string();
    if result.len() < text.len() {
        result.push_str("...");
    }

    result
}

/// Calculate how many sentences to select based on document length.
fn calculate_target_sentence_count(total_sentences: usize) -> usize {
    match total_sentences {
        0..=3 => total_sentences,
        4..=6 => 3,
        7..=10 => 5,
        11..=20 => 7,
        _ => (total_sentences as f64 * 0.3).ceil() as usize, // ~30% of sentences
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_title_short_content() {
        let config = SummaryConfig::default();
        let title = generate_title("Short title.", &config);
        assert_eq!(title, "Short title.");
    }

    #[test]
    fn test_generate_title_long_content() {
        let config = SummaryConfig::default();
        let long_text = "This is a very long sentence that definitely exceeds the maximum character limit for a title summary and should be truncated at a word boundary.";
        let title = generate_title(long_text, &config);
        assert!(title.len() <= config.title_max_chars + 3); // +3 for "..."
        assert!(title.ends_with("..."));
    }

    #[test]
    fn test_generate_title_empty() {
        let config = SummaryConfig::default();
        assert!(generate_title("", &config).is_empty());
        assert!(generate_title("   ", &config).is_empty());
    }

    #[test]
    fn test_generate_brief() {
        let config = SummaryConfig::default();
        let content = "First sentence is important. Second sentence adds context. Third sentence has details. Fourth sentence concludes.";
        let brief = generate_brief(content, &config);

        // Should contain first sentence
        assert!(brief.starts_with("First sentence is important."));
        // Should be within limit
        assert!(brief.len() <= config.brief_max_chars);
    }

    #[test]
    fn test_generate_brief_single_sentence() {
        let config = SummaryConfig::default();
        let content = "Just one sentence here.";
        let brief = generate_brief(content, &config);
        assert_eq!(brief, "Just one sentence here.");
    }

    #[test]
    fn test_generate_standard() {
        let config = SummaryConfig::default();
        let content = "First sentence introduces the topic. \
            Second sentence provides background. \
            Third sentence explains the main point. \
            Fourth sentence gives examples. \
            Fifth sentence discusses implications. \
            Sixth sentence mentions alternatives. \
            Seventh sentence summarizes findings. \
            Eighth sentence concludes the discussion.";

        let standard = generate_standard(content, &config);

        // Should be within limit
        assert!(standard.len() <= config.standard_max_chars);
        // Should contain multiple sentences
        assert!(standard.matches('.').count() >= 2);
    }

    #[test]
    fn test_generate_standard_short_content() {
        let config = SummaryConfig::default();
        let content = "Short content. Only two sentences.";
        let standard = generate_standard(content, &config);
        assert_eq!(standard, "Short content. Only two sentences.");
    }

    #[test]
    fn test_generate_all_summaries() {
        let content = "Machine learning is revolutionizing technology. \
            It enables computers to learn from data. \
            Applications include image recognition and natural language processing. \
            Companies are investing heavily in AI research.";

        let summaries = generate_all_summaries(content);

        assert!(summaries.title.is_some());
        assert!(summaries.brief.is_some());
        assert!(summaries.standard.is_some());
        assert_eq!(summaries.version, 1);
        assert!(!summaries.content_hash.is_empty());
    }

    #[test]
    fn test_generate_all_summaries_empty() {
        let summaries = generate_all_summaries("");

        assert!(summaries.title.is_none());
        assert!(summaries.brief.is_none());
        assert!(summaries.standard.is_none());
    }

    #[test]
    fn test_truncate_at_word_boundary() {
        let text = "Hello world this is a test";
        let truncated = truncate_at_word_boundary(text, 15);
        assert_eq!(truncated, "Hello world...");
    }

    #[test]
    fn test_truncate_at_word_boundary_no_truncation() {
        let text = "Short text";
        let truncated = truncate_at_word_boundary(text, 100);
        assert_eq!(truncated, "Short text");
    }

    #[test]
    fn test_calculate_target_sentence_count() {
        assert_eq!(calculate_target_sentence_count(2), 2);
        assert_eq!(calculate_target_sentence_count(5), 3);
        assert_eq!(calculate_target_sentence_count(8), 5);
        assert_eq!(calculate_target_sentence_count(15), 7);
        assert_eq!(calculate_target_sentence_count(100), 30);
    }

    #[test]
    fn test_chinese_content_summarization() {
        let content = "机器学习正在改变技术领域。它使计算机能够从数据中学习。应用包括图像识别和自然语言处理。公司正在大力投资人工智能研究。";

        let summaries = generate_all_summaries(content);

        assert!(summaries.title.is_some());
        assert!(summaries.brief.is_some());
    }
}
