//! Relevance scoring for context injection
//!
//! Combines multiple signals (semantic similarity, keywords, recency, access frequency,
//! user priority) to rank memories by relevance to current intent.

use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq)]
pub struct RelevanceScore {
    pub semantic: f64,
    pub keyword: f64,
    pub recency: f64,
    pub access_freq: f64,
    pub user_priority: f64,
}

impl Default for RelevanceScore {
    fn default() -> Self {
        Self {
            semantic: 0.0,
            keyword: 0.0,
            recency: 0.0,
            access_freq: 0.0,
            user_priority: 0.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct RelevanceWeights {
    pub semantic: f64,
    pub keyword: f64,
    pub recency: f64,
    pub access_freq: f64,
    pub user_priority: f64,
}

pub const DEFAULT_WEIGHTS: RelevanceWeights = RelevanceWeights {
    semantic: 0.4,
    keyword: 0.2,
    recency: 0.2,
    access_freq: 0.1,
    user_priority: 0.1,
};

pub fn recency_decay(updated_at: i64, decay_rate: f64) -> f64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let age_seconds = (now - updated_at).max(0);
    let age_days = age_seconds as f64 / 86400.0;

    (-decay_rate * age_days).exp().clamp(0.0, 1.0)
}

pub fn normalize_access_frequency(access_count: u32, max_count: u32) -> f64 {
    if max_count == 0 {
        return 0.0;
    }

    (access_count as f64 / max_count as f64).clamp(0.0, 1.0)
}

pub fn compute_relevance(scores: &RelevanceScore, weights: &RelevanceWeights) -> f64 {
    let weighted_sum = scores.semantic * weights.semantic
        + scores.keyword * weights.keyword
        + scores.recency * weights.recency
        + scores.access_freq * weights.access_freq
        + scores.user_priority * weights.user_priority;

    weighted_sum.clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relevance_score_default() {
        let score = RelevanceScore::default();
        assert_eq!(score.semantic, 0.0);
        assert_eq!(score.keyword, 0.0);
        assert_eq!(score.recency, 0.0);
        assert_eq!(score.access_freq, 0.0);
        assert_eq!(score.user_priority, 0.0);
    }

    #[test]
    fn test_default_weights_sum_to_one() {
        let weights = DEFAULT_WEIGHTS;
        let sum = weights.semantic
            + weights.keyword
            + weights.recency
            + weights.access_freq
            + weights.user_priority;
        assert!((sum - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_recency_decay_recent() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let score = recency_decay(now, 0.1);
        assert!(score > 0.99);
        assert!(score <= 1.0);
    }

    #[test]
    fn test_recency_decay_old() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let old_timestamp = now - (30 * 24 * 3600);
        let score = recency_decay(old_timestamp, 0.1);

        assert!(score < 0.1);
        assert!(score > 0.0);
    }

    #[test]
    fn test_recency_decay_very_old() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let very_old = now - (365 * 24 * 3600);
        let score = recency_decay(very_old, 0.1);

        assert!(score < 0.0001);
        assert!(score >= 0.0);
    }

    #[test]
    fn test_recency_decay_future_timestamp() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let future = now + 1000;
        let score = recency_decay(future, 0.1);
        assert!(score > 0.99);
    }

    #[test]
    fn test_recency_decay_different_rates() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let one_week_ago = now - (7 * 24 * 3600);

        let slow_decay = recency_decay(one_week_ago, 0.05);
        let fast_decay = recency_decay(one_week_ago, 0.2);

        assert!(slow_decay > fast_decay);
    }

    #[test]
    fn test_normalize_access_frequency_zero() {
        assert_eq!(normalize_access_frequency(0, 100), 0.0);
    }

    #[test]
    fn test_normalize_access_frequency_half() {
        assert_eq!(normalize_access_frequency(50, 100), 0.5);
    }

    #[test]
    fn test_normalize_access_frequency_at_max() {
        assert_eq!(normalize_access_frequency(100, 100), 1.0);
    }

    #[test]
    fn test_normalize_access_frequency_above_max() {
        let score = normalize_access_frequency(150, 100);
        assert_eq!(score, 1.0);
    }

    #[test]
    fn test_normalize_access_frequency_max_zero() {
        let score = normalize_access_frequency(10, 0);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn test_compute_relevance_all_ones() {
        let scores = RelevanceScore {
            semantic: 1.0,
            keyword: 1.0,
            recency: 1.0,
            access_freq: 1.0,
            user_priority: 1.0,
        };

        let result = compute_relevance(&scores, &DEFAULT_WEIGHTS);
        assert!((result - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_compute_relevance_all_zeros() {
        let scores = RelevanceScore::default();
        let result = compute_relevance(&scores, &DEFAULT_WEIGHTS);
        assert!((result - 0.0).abs() < 0.0001);
    }

    #[test]
    fn test_compute_relevance_semantic_dominant() {
        let scores = RelevanceScore {
            semantic: 1.0,
            keyword: 0.0,
            recency: 0.0,
            access_freq: 0.0,
            user_priority: 0.0,
        };

        let result = compute_relevance(&scores, &DEFAULT_WEIGHTS);
        assert!((result - 0.4).abs() < 0.0001);
    }

    #[test]
    fn test_compute_relevance_mixed() {
        let scores = RelevanceScore {
            semantic: 0.8,
            keyword: 0.6,
            recency: 0.9,
            access_freq: 0.3,
            user_priority: 1.0,
        };

        let result = compute_relevance(&scores, &DEFAULT_WEIGHTS);
        assert!((result - 0.75).abs() < 0.0001);
    }

    #[test]
    fn test_compute_relevance_user_priority_boost() {
        let without_priority = RelevanceScore {
            semantic: 0.5,
            keyword: 0.5,
            recency: 0.5,
            access_freq: 0.5,
            user_priority: 0.0,
        };

        let with_priority = RelevanceScore {
            semantic: 0.5,
            keyword: 0.5,
            recency: 0.5,
            access_freq: 0.5,
            user_priority: 1.0,
        };

        let score_without = compute_relevance(&without_priority, &DEFAULT_WEIGHTS);
        let score_with = compute_relevance(&with_priority, &DEFAULT_WEIGHTS);

        assert!((score_with - score_without - 0.1).abs() < 0.0001);
    }

    #[test]
    fn test_compute_relevance_custom_weights() {
        let scores = RelevanceScore {
            semantic: 0.9,
            keyword: 0.1,
            recency: 0.1,
            access_freq: 0.1,
            user_priority: 0.1,
        };

        let equal_weights = RelevanceWeights {
            semantic: 0.2,
            keyword: 0.2,
            recency: 0.2,
            access_freq: 0.2,
            user_priority: 0.2,
        };

        let result = compute_relevance(&scores, &equal_weights);
        assert!((result - 0.26).abs() < 0.0001);
    }
}
