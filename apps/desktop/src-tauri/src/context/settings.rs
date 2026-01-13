//! Context injection settings
//!
//! User-configurable settings for context injection behavior.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextSettings {
    pub enabled: bool,
    pub max_tokens: usize,
    pub max_memories: usize,
    pub min_relevance: f64,
    pub include_recent: bool,
    pub decay_rate: f64,
}

impl Default for ContextSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            max_tokens: 2000,
            max_memories: 5,
            min_relevance: 0.3,
            include_recent: true,
            decay_rate: 0.1,
        }
    }
}

impl ContextSettings {
    pub fn to_budget(&self) -> super::ContextBudget {
        super::ContextBudget {
            max_tokens: self.max_tokens,
            max_memories: self.max_memories,
            max_per_memory: 300,
            reserve_ratio: 0.2,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = ContextSettings::default();
        assert!(settings.enabled);
        assert_eq!(settings.max_tokens, 2000);
        assert_eq!(settings.max_memories, 5);
        assert_eq!(settings.min_relevance, 0.3);
        assert!(settings.include_recent);
        assert_eq!(settings.decay_rate, 0.1);
    }

    #[test]
    fn test_to_budget() {
        let settings = ContextSettings {
            enabled: true,
            max_tokens: 3000,
            max_memories: 10,
            min_relevance: 0.5,
            include_recent: false,
            decay_rate: 0.2,
        };

        let budget = settings.to_budget();
        assert_eq!(budget.max_tokens, 3000);
        assert_eq!(budget.max_memories, 10);
        assert_eq!(budget.max_per_memory, 300);
        assert_eq!(budget.reserve_ratio, 0.2);
    }

    #[test]
    fn test_serialize_deserialize() {
        let settings = ContextSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: ContextSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings.enabled, deserialized.enabled);
        assert_eq!(settings.max_tokens, deserialized.max_tokens);
        assert_eq!(settings.max_memories, deserialized.max_memories);
        assert_eq!(settings.min_relevance, deserialized.min_relevance);
        assert_eq!(settings.include_recent, deserialized.include_recent);
        assert_eq!(settings.decay_rate, deserialized.decay_rate);
    }
}
