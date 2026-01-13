//! Content hashing for staleness detection
//!
//! Uses SHA-256 to detect when content has changed and summaries need regeneration.

use sha2::{Digest, Sha256};

/// Compute a content hash for staleness detection.
///
/// Uses SHA-256 truncated to 16 characters for storage efficiency.
pub fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();

    // Truncate to 16 hex characters (8 bytes = 64 bits)
    hex::encode(&result[..8])
}

/// Check if the stored hash matches the current content.
pub fn hash_matches(content: &str, stored_hash: &str) -> bool {
    content_hash(content) == stored_hash
}

/// Check if summaries are stale based on content hash comparison.
///
/// Returns true if:
/// - No hash is stored (summaries never generated)
/// - Hash doesn't match (content has changed)
pub fn is_summary_stale(content: &str, stored_hash: Option<&str>) -> bool {
    match stored_hash {
        None => true,
        Some(hash) => !hash_matches(content, hash),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_hash_deterministic() {
        let content = "Hello, world!";
        let hash1 = content_hash(content);
        let hash2 = content_hash(content);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_content_hash_length() {
        let hash = content_hash("test content");
        assert_eq!(hash.len(), 16); // 8 bytes = 16 hex chars
    }

    #[test]
    fn test_content_hash_different_content() {
        let hash1 = content_hash("content one");
        let hash2 = content_hash("content two");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_matches() {
        let content = "test content";
        let hash = content_hash(content);
        assert!(hash_matches(content, &hash));
        assert!(!hash_matches("different content", &hash));
    }

    #[test]
    fn test_is_summary_stale_no_hash() {
        assert!(is_summary_stale("any content", None));
    }

    #[test]
    fn test_is_summary_stale_matching_hash() {
        let content = "test content";
        let hash = content_hash(content);
        assert!(!is_summary_stale(content, Some(&hash)));
    }

    #[test]
    fn test_is_summary_stale_different_content() {
        let original = "original content";
        let hash = content_hash(original);
        assert!(is_summary_stale("modified content", Some(&hash)));
    }

    #[test]
    fn test_hash_unicode() {
        let hash1 = content_hash("中文测试");
        let hash2 = content_hash("中文测试");
        assert_eq!(hash1, hash2);

        let hash3 = content_hash("日本語テスト");
        assert_ne!(hash1, hash3);
    }
}
