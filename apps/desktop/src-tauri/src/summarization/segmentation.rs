//! Sentence segmentation for extractive summarization
//!
//! Supports both English and Chinese text with automatic language detection.

/// Check if a character is CJK (Chinese, Japanese, Korean)
fn is_cjk_char(c: char) -> bool {
    matches!(c,
        '\u{4E00}'..='\u{9FFF}' |   // CJK Unified Ideographs
        '\u{3400}'..='\u{4DBF}' |   // CJK Unified Ideographs Extension A
        '\u{20000}'..='\u{2A6DF}' | // CJK Unified Ideographs Extension B
        '\u{F900}'..='\u{FAFF}' |   // CJK Compatibility Ideographs
        '\u{3040}'..='\u{309F}' |   // Hiragana
        '\u{30A0}'..='\u{30FF}' |   // Katakana
        '\u{AC00}'..='\u{D7AF}'     // Korean Hangul
    )
}

/// Check if text is primarily CJK (>30% CJK characters)
pub fn is_primarily_cjk(text: &str) -> bool {
    let total_chars = text.chars().filter(|c| !c.is_whitespace()).count();
    if total_chars == 0 {
        return false;
    }

    let cjk_count = text.chars().filter(|&c| is_cjk_char(c)).count();
    (cjk_count as f64 / total_chars as f64) > 0.3
}

/// Split English text into sentences.
///
/// Splits on sentence-ending punctuation (. ! ?) followed by whitespace or end of string.
/// Handles common abbreviations and edge cases.
pub fn split_sentences_en(text: &str) -> Vec<&str> {
    if text.trim().is_empty() {
        return vec![];
    }

    let mut sentences = Vec::new();
    let mut last_end = 0;
    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();

    for (i, &c) in chars.iter().enumerate() {
        if c == '.' || c == '!' || c == '?' {
            // Check if followed by whitespace, end of string, or closing quote
            let is_end = i + 1 >= len
                || chars[i + 1].is_whitespace()
                || chars[i + 1] == '"'
                || chars[i + 1] == '\'';

            // Skip common abbreviations (Mr., Dr., etc.)
            let is_abbrev = i >= 1 && {
                let prev_start = last_end.max(i.saturating_sub(3));
                let prefix: String = chars[prev_start..=i].iter().collect();
                let prefix_lower = prefix.to_lowercase();
                prefix_lower.ends_with("mr.")
                    || prefix_lower.ends_with("mrs.")
                    || prefix_lower.ends_with("dr.")
                    || prefix_lower.ends_with("vs.")
                    || prefix_lower.ends_with("etc.")
                    || prefix_lower.ends_with("e.g.")
                    || prefix_lower.ends_with("i.e.")
            };

            if is_end && !is_abbrev {
                let byte_start: usize = chars[..last_end].iter().map(|c| c.len_utf8()).sum();
                let byte_end: usize = chars[..=i].iter().map(|c| c.len_utf8()).sum();
                let sentence = text[byte_start..byte_end].trim();
                if !sentence.is_empty() {
                    sentences.push(sentence);
                }
                last_end = i + 1;
            }
        }
    }

    // Add remaining text as last sentence
    if last_end < len {
        let byte_start: usize = chars[..last_end].iter().map(|c| c.len_utf8()).sum();
        let remaining = text[byte_start..].trim();
        if !remaining.is_empty() {
            sentences.push(remaining);
        }
    }

    sentences
}

/// Split Chinese text into sentences.
///
/// Splits on CJK sentence-ending punctuation: 。！？
pub fn split_sentences_zh(text: &str) -> Vec<&str> {
    if text.trim().is_empty() {
        return vec![];
    }

    let mut sentences = Vec::new();
    let mut last_end = 0;

    for (i, c) in text.char_indices() {
        if c == '。' || c == '！' || c == '？' || c == '；' {
            let end = i + c.len_utf8();
            let sentence = text[last_end..end].trim();
            if !sentence.is_empty() {
                sentences.push(sentence);
            }
            last_end = end;
        }
    }

    // Add remaining text as last sentence
    if last_end < text.len() {
        let remaining = text[last_end..].trim();
        if !remaining.is_empty() {
            sentences.push(remaining);
        }
    }

    sentences
}

/// Split text into sentences with automatic language detection.
///
/// Uses CJK detection to choose appropriate splitting strategy.
/// For mixed content, uses the dominant language's rules.
pub fn split_sentences(text: &str) -> Vec<&str> {
    if is_primarily_cjk(text) {
        split_sentences_zh(text)
    } else {
        split_sentences_en(text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_cjk_char() {
        assert!(is_cjk_char('中'));
        assert!(is_cjk_char('日'));
        assert!(is_cjk_char('한'));
        assert!(!is_cjk_char('A'));
        assert!(!is_cjk_char('1'));
    }

    #[test]
    fn test_is_primarily_cjk() {
        assert!(is_primarily_cjk("这是一段中文文本"));
        // Mixed content: 4 CJK chars + ~18 English chars = ~18% CJK, below 30% threshold
        assert!(!is_primarily_cjk("这是中文 with some English"));
        assert!(!is_primarily_cjk("This is English text"));
        assert!(!is_primarily_cjk("English with 一个 Chinese word"));
        assert!(!is_primarily_cjk(""));
        // Mostly Chinese with some English
        assert!(is_primarily_cjk("这是中文测试一二三四五六七八九十"));
    }

    #[test]
    fn test_split_sentences_en_basic() {
        let text = "Hello world. This is a test. How are you?";
        let sentences = split_sentences_en(text);
        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "Hello world.");
        assert_eq!(sentences[1], "This is a test.");
        assert_eq!(sentences[2], "How are you?");
    }

    #[test]
    fn test_split_sentences_en_exclamation() {
        let text = "Wow! That's amazing. Really?";
        let sentences = split_sentences_en(text);
        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "Wow!");
        assert_eq!(sentences[1], "That's amazing.");
        assert_eq!(sentences[2], "Really?");
    }

    #[test]
    fn test_split_sentences_en_no_ending_punctuation() {
        let text = "This has no ending punctuation";
        let sentences = split_sentences_en(text);
        assert_eq!(sentences.len(), 1);
        assert_eq!(sentences[0], "This has no ending punctuation");
    }

    #[test]
    fn test_split_sentences_en_empty() {
        assert!(split_sentences_en("").is_empty());
        assert!(split_sentences_en("   ").is_empty());
    }

    #[test]
    fn test_split_sentences_zh_basic() {
        let text = "这是第一句话。这是第二句话！你好吗？";
        let sentences = split_sentences_zh(text);
        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "这是第一句话。");
        assert_eq!(sentences[1], "这是第二句话！");
        assert_eq!(sentences[2], "你好吗？");
    }

    #[test]
    fn test_split_sentences_zh_semicolon() {
        let text = "第一部分；第二部分。";
        let sentences = split_sentences_zh(text);
        assert_eq!(sentences.len(), 2);
    }

    #[test]
    fn test_split_sentences_zh_no_ending() {
        let text = "这句话没有结尾标点";
        let sentences = split_sentences_zh(text);
        assert_eq!(sentences.len(), 1);
        assert_eq!(sentences[0], "这句话没有结尾标点");
    }

    #[test]
    fn test_split_sentences_auto_detect_english() {
        let text = "This is English. Testing auto-detection.";
        let sentences = split_sentences(text);
        assert_eq!(sentences.len(), 2);
    }

    #[test]
    fn test_split_sentences_auto_detect_chinese() {
        let text = "这是中文。自动检测测试。";
        let sentences = split_sentences(text);
        assert_eq!(sentences.len(), 2);
    }

    #[test]
    fn test_split_sentences_mixed_content() {
        // Primarily Chinese, should use Chinese rules
        let text = "这是测试。This is a test。继续中文。";
        let sentences = split_sentences(text);
        assert_eq!(sentences.len(), 3);
    }
}
