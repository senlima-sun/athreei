//! Word tokenization for term frequency calculation
//!
//! Handles both English (whitespace-based) and Chinese (character-based) text.

use super::segmentation::is_primarily_cjk;

/// Common English stop words to filter out
const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it",
    "its", "of", "on", "or", "that", "the", "to", "was", "were", "will", "with", "this", "but",
    "they", "have", "had", "what", "when", "where", "who", "which", "how", "can", "could", "would",
    "should", "may", "might", "must", "do", "does", "did", "been", "being", "if", "so", "than",
    "then", "there", "these", "those", "we", "you", "your", "our", "their", "my", "me", "him",
    "her", "them", "us", "i", "not", "no", "just", "only", "also", "about", "into", "more",
];

/// Check if a word is a stop word
fn is_stop_word(word: &str) -> bool {
    STOP_WORDS.contains(&word.to_lowercase().as_str())
}

/// Tokenize English text into words.
///
/// Splits on whitespace and punctuation, converts to lowercase,
/// and filters out stop words and short tokens.
pub fn tokenize_words_en(text: &str) -> Vec<String> {
    text.split(|c: char| c.is_whitespace() || c.is_ascii_punctuation())
        .map(|w| w.to_lowercase())
        .filter(|w| w.len() > 2 && !is_stop_word(w))
        .collect()
}

/// Tokenize Chinese text into characters/words.
///
/// Uses character-based tokenization since Chinese doesn't use spaces.
/// Filters out punctuation and whitespace.
pub fn tokenize_words_zh(text: &str) -> Vec<String> {
    text.chars()
        .filter(|c| {
            !c.is_whitespace()
                && !c.is_ascii_punctuation()
                && !matches!(
                    *c,
                    '。' | '，'
                        | '！'
                        | '？'
                        | '、'
                        | '；'
                        | '：'
                        | '"'
                        | '"'
                        | '\u{2018}' // Left single quote '
                        | '\u{2019}' // Right single quote '
                        | '（'
                        | '）'
                        | '【'
                        | '】'
                        | '《'
                        | '》'
                )
        })
        .map(|c| c.to_string())
        .collect()
}

/// Tokenize text with automatic language detection.
pub fn tokenize_words(text: &str) -> Vec<String> {
    if is_primarily_cjk(text) {
        tokenize_words_zh(text)
    } else {
        tokenize_words_en(text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_words_en_basic() {
        let text = "The quick brown fox jumps over the lazy dog.";
        let tokens = tokenize_words_en(text);

        // Should filter out stop words like "the"
        assert!(tokens.contains(&"quick".to_string()));
        assert!(tokens.contains(&"brown".to_string()));
        assert!(tokens.contains(&"fox".to_string()));
        assert!(tokens.contains(&"jumps".to_string()));
        assert!(tokens.contains(&"lazy".to_string()));
        assert!(tokens.contains(&"dog".to_string()));
        assert!(tokens.contains(&"over".to_string())); // "over" is not a stop word
        assert!(!tokens.contains(&"the".to_string())); // "the" is a stop word
    }

    #[test]
    fn test_tokenize_words_en_short_words() {
        let text = "I am a person who is nice.";
        let tokens = tokenize_words_en(text);

        // Short words (len <= 2) should be filtered
        assert!(!tokens.contains(&"i".to_string()));
        assert!(!tokens.contains(&"am".to_string()));
        assert!(!tokens.contains(&"a".to_string()));
        assert!(tokens.contains(&"person".to_string()));
        assert!(tokens.contains(&"nice".to_string()));
    }

    #[test]
    fn test_tokenize_words_zh_basic() {
        let text = "这是一个测试文本。";
        let tokens = tokenize_words_zh(text);

        // Should have individual characters (no punctuation)
        assert!(tokens.contains(&"这".to_string()));
        assert!(tokens.contains(&"是".to_string()));
        assert!(tokens.contains(&"测".to_string()));
        assert!(tokens.contains(&"试".to_string()));
        assert!(!tokens.contains(&"。".to_string()));
    }

    #[test]
    fn test_tokenize_words_zh_filters_punctuation() {
        let text = "你好！世界？";
        let tokens = tokenize_words_zh(text);

        assert!(!tokens.contains(&"！".to_string()));
        assert!(!tokens.contains(&"？".to_string()));
        assert!(tokens.contains(&"你".to_string()));
        assert!(tokens.contains(&"好".to_string()));
        assert!(tokens.contains(&"世".to_string()));
        assert!(tokens.contains(&"界".to_string()));
    }

    #[test]
    fn test_tokenize_words_auto_english() {
        let text = "Hello world, this is a test.";
        let tokens = tokenize_words(text);
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"test".to_string()));
    }

    #[test]
    fn test_tokenize_words_auto_chinese() {
        let text = "你好世界，这是测试。";
        let tokens = tokenize_words(text);
        assert!(tokens.contains(&"你".to_string()));
        assert!(tokens.contains(&"世".to_string()));
    }

    #[test]
    fn test_is_stop_word() {
        assert!(is_stop_word("the"));
        assert!(is_stop_word("THE"));
        assert!(is_stop_word("is"));
        assert!(!is_stop_word("computer"));
        assert!(!is_stop_word("algorithm"));
    }
}
