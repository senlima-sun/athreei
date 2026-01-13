//! Sentence scoring for extractive summarization
//!
//! Uses term frequency and position-based scoring to rank sentences.

use super::tokenize::tokenize_words;
use std::collections::HashMap;

/// Calculate term frequency (TF) for all terms in the given sentences.
///
/// Returns a map of term -> normalized frequency (0.0-1.0).
pub fn calculate_tf(sentences: &[&str]) -> HashMap<String, f64> {
    let mut term_counts: HashMap<String, usize> = HashMap::new();
    let mut total_terms = 0usize;

    for sentence in sentences {
        for term in tokenize_words(sentence) {
            *term_counts.entry(term).or_insert(0) += 1;
            total_terms += 1;
        }
    }

    if total_terms == 0 {
        return HashMap::new();
    }

    let max_count = term_counts.values().max().copied().unwrap_or(1) as f64;

    term_counts
        .into_iter()
        .map(|(term, count)| (term, count as f64 / max_count))
        .collect()
}

/// Score sentences based on keyword density.
///
/// Returns a vector of (sentence_index, score) pairs sorted by score descending.
pub fn score_sentences(sentences: &[&str], tf: &HashMap<String, f64>) -> Vec<(usize, f64)> {
    let mut scores: Vec<(usize, f64)> = sentences
        .iter()
        .enumerate()
        .map(|(i, sentence)| {
            let tokens = tokenize_words(sentence);
            let token_count = tokens.len();

            if token_count == 0 {
                return (i, 0.0);
            }

            // Sum of TF scores for all terms in sentence
            let tf_sum: f64 = tokens
                .iter()
                .map(|term| tf.get(term).copied().unwrap_or(0.0))
                .sum();

            // Normalize by sentence length to avoid bias toward longer sentences
            let score = tf_sum / (token_count as f64).sqrt();

            (i, score)
        })
        .collect();

    // Sort by score descending
    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    scores
}

/// Apply position-based score boost.
///
/// Earlier sentences (especially first sentences) get higher scores,
/// as they often contain the most important information (lead bias).
///
/// # Arguments
/// * `scores` - Mutable reference to (index, score) pairs
/// * `decay` - Decay factor (0.0-1.0), higher values = slower decay
/// * `total_sentences` - Total number of sentences for position calculation
pub fn apply_position_boost(scores: &mut [(usize, f64)], decay: f64, total_sentences: usize) {
    if total_sentences == 0 {
        return;
    }

    for (idx, score) in scores.iter_mut() {
        // Calculate position factor: first sentence gets full boost, later sentences decay
        let position_ratio = *idx as f64 / total_sentences as f64;
        let position_boost = decay.powf(position_ratio * 3.0); // Exponential decay

        // First sentence always gets extra boost
        let first_sentence_boost = if *idx == 0 { 1.5 } else { 1.0 };

        *score *= position_boost * first_sentence_boost;
    }

    // Re-sort after applying boost
    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
}

/// Select top N sentences, preserving their original order.
///
/// Returns sentence indices sorted by their original position.
pub fn select_top_sentences(scores: &[(usize, f64)], n: usize) -> Vec<usize> {
    let mut top_indices: Vec<usize> = scores.iter().take(n).map(|(idx, _)| *idx).collect();
    top_indices.sort(); // Restore original order
    top_indices
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_tf() {
        let sentences = vec!["hello world", "hello again", "world test"];
        let tf = calculate_tf(&sentences);

        // "hello" appears twice, "world" appears twice
        assert!(tf.contains_key("hello"));
        assert!(tf.contains_key("world"));
        assert!(tf.contains_key("again"));
        assert!(tf.contains_key("test"));
    }

    #[test]
    fn test_calculate_tf_empty() {
        let sentences: Vec<&str> = vec![];
        let tf = calculate_tf(&sentences);
        assert!(tf.is_empty());
    }

    #[test]
    fn test_score_sentences() {
        let sentences = vec![
            "Machine learning is a subset of artificial intelligence.",
            "AI and machine learning are transforming industries.",
            "The weather today is sunny.",
        ];

        let tf = calculate_tf(&sentences);
        let scores = score_sentences(&sentences, &tf);

        // First two sentences should score higher due to shared terms
        let (top_idx, _) = scores[0];
        assert!(top_idx == 0 || top_idx == 1);

        // Weather sentence should score lower
        let weather_score = scores.iter().find(|(i, _)| *i == 2).map(|(_, s)| *s);
        let ml_score = scores.iter().find(|(i, _)| *i == 0).map(|(_, s)| *s);
        assert!(weather_score < ml_score);
    }

    #[test]
    fn test_apply_position_boost() {
        let sentences = vec!["First sentence.", "Second sentence.", "Third sentence."];
        let tf = calculate_tf(&sentences);
        let mut scores = score_sentences(&sentences, &tf);

        // Give all sentences equal base score for this test
        for (_, score) in scores.iter_mut() {
            *score = 1.0;
        }

        apply_position_boost(&mut scores, 0.9, 3);

        // First sentence (index 0) should now have highest score due to boost
        let first_score = scores.iter().find(|(i, _)| *i == 0).map(|(_, s)| *s).unwrap();
        let last_score = scores.iter().find(|(i, _)| *i == 2).map(|(_, s)| *s).unwrap();

        assert!(first_score > last_score);
    }

    #[test]
    fn test_select_top_sentences_preserves_order() {
        // Scores: sentence 2 > sentence 0 > sentence 1
        let scores = vec![(2, 3.0), (0, 2.0), (1, 1.0)];

        let selected = select_top_sentences(&scores, 2);

        // Should select indices 2 and 0, but return them in original order: [0, 2]
        assert_eq!(selected, vec![0, 2]);
    }

    #[test]
    fn test_select_top_sentences_limit() {
        let scores = vec![(0, 3.0), (1, 2.0), (2, 1.0)];

        let selected = select_top_sentences(&scores, 5); // More than available
        assert_eq!(selected.len(), 3); // Should only return what's available
    }
}
