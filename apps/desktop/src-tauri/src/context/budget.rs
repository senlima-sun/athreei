//! Context budget management
//!
//! Manages token budget allocation for context injection, ensuring we stay
//! within limits while selecting the most relevant memories.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextBudget {
    pub max_tokens: usize,
    pub max_memories: usize,
    pub max_per_memory: usize,
    pub reserve_ratio: f64,
}

impl Default for ContextBudget {
    fn default() -> Self {
        DEFAULT_BUDGET
    }
}

pub const DEFAULT_BUDGET: ContextBudget = ContextBudget {
    max_tokens: 2000,
    max_memories: 5,
    max_per_memory: 300,
    reserve_ratio: 0.2,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoredMemory {
    pub id: String,
    pub content: String,
    pub title: Option<String>,
    pub score: f64,
}

fn is_cjk_char(c: char) -> bool {
    matches!(c,
        '\u{4E00}'..='\u{9FFF}' |
        '\u{3400}'..='\u{4DBF}' |
        '\u{20000}'..='\u{2A6DF}' |
        '\u{F900}'..='\u{FAFF}' |
        '\u{3040}'..='\u{309F}' |
        '\u{30A0}'..='\u{30FF}' |
        '\u{AC00}'..='\u{D7AF}'
    )
}

fn is_primarily_cjk(text: &str) -> bool {
    let total_chars: Vec<char> = text.chars().filter(|c| !c.is_whitespace()).collect();
    if total_chars.is_empty() {
        return false;
    }

    let cjk_count = total_chars.iter().filter(|&&c| is_cjk_char(c)).count();
    (cjk_count as f64 / total_chars.len() as f64) > 0.3
}

pub fn estimate_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }

    if is_primarily_cjk(text) {
        let char_count = text.chars().filter(|c| !c.is_whitespace()).count();
        ((char_count as f64) * 1.5).ceil() as usize
    } else {
        let word_count = text
            .split(|c: char| c.is_whitespace() || c.is_ascii_punctuation())
            .filter(|w| !w.is_empty())
            .count();
        ((word_count as f64) * 1.3).ceil() as usize
    }
}

pub fn select_within_budget(
    mut candidates: Vec<ScoredMemory>,
    budget: &ContextBudget,
) -> Vec<ScoredMemory> {
    if candidates.is_empty() {
        return vec![];
    }

    candidates.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let effective_budget = (budget.max_tokens as f64 * (1.0 - budget.reserve_ratio)) as usize;
    let mut remaining_budget = effective_budget;
    let mut selected = Vec::new();

    for memory in candidates {
        if selected.len() >= budget.max_memories {
            break;
        }

        let truncated_content = truncate_content(&memory.content, budget.max_per_memory);
        let content_tokens = estimate_tokens(&truncated_content);

        if content_tokens > remaining_budget {
            let min_budget = remaining_budget.min(budget.max_per_memory);
            if min_budget < 50 {
                break;
            }

            let truncated = truncate_content(&memory.content, min_budget);
            let tokens = estimate_tokens(&truncated);

            if tokens <= remaining_budget {
                selected.push(ScoredMemory {
                    id: memory.id,
                    content: truncated,
                    title: memory.title,
                    score: memory.score,
                });
                remaining_budget = remaining_budget.saturating_sub(tokens);
            }
            break;
        }

        selected.push(ScoredMemory {
            id: memory.id,
            content: truncated_content,
            title: memory.title,
            score: memory.score,
        });
        remaining_budget = remaining_budget.saturating_sub(content_tokens);
    }

    selected
}

pub fn truncate_content(content: &str, max_tokens: usize) -> String {
    let current_tokens = estimate_tokens(content);

    if current_tokens <= max_tokens {
        return content.to_string();
    }

    if is_primarily_cjk(content) {
        let target_chars = ((max_tokens as f64 / 1.5) as usize).saturating_sub(1);
        let truncated: String = content.chars().take(target_chars).collect();
        format!("{}…", truncated)
    } else {
        let target_words = ((max_tokens as f64 / 1.3) as usize).saturating_sub(1);

        let words: Vec<&str> = content
            .split(|c: char| c.is_whitespace())
            .filter(|w| !w.is_empty())
            .collect();

        if words.is_empty() {
            return String::new();
        }

        let truncated_words = words.into_iter().take(target_words).collect::<Vec<_>>();
        format!("{}...", truncated_words.join(" "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_budget() {
        let budget = ContextBudget::default();
        assert_eq!(budget.max_tokens, 2000);
        assert_eq!(budget.max_memories, 5);
        assert_eq!(budget.max_per_memory, 300);
        assert_eq!(budget.reserve_ratio, 0.2);
    }

    #[test]
    fn test_estimate_tokens_english() {
        let text = "The quick brown fox jumps over the lazy dog";
        let tokens = estimate_tokens(text);
        assert!(tokens >= 11 && tokens <= 13);
    }

    #[test]
    fn test_estimate_tokens_cjk() {
        let text = "这是一个测试文本";
        let tokens = estimate_tokens(text);
        assert!(tokens >= 10 && tokens <= 14);
    }

    #[test]
    fn test_estimate_tokens_empty() {
        assert_eq!(estimate_tokens(""), 0);
    }

    #[test]
    fn test_truncate_content_no_truncation() {
        let content = "Short text";
        let truncated = truncate_content(content, 100);
        assert_eq!(truncated, content);
    }

    #[test]
    fn test_truncate_content_english() {
        let content = "The quick brown fox jumps over the lazy dog and continues running";
        let truncated = truncate_content(content, 10);
        assert!(truncated.ends_with("..."));
        assert!(truncated.len() < content.len());
    }

    #[test]
    fn test_truncate_content_cjk() {
        let content = "这是一个非常长的中文文本测试内容需要被截断处理";
        let truncated = truncate_content(content, 10);
        assert!(truncated.ends_with("…"));
        assert!(truncated.len() < content.len());
    }

    #[test]
    fn test_select_within_budget_empty() {
        let candidates = vec![];
        let budget = ContextBudget::default();
        let selected = select_within_budget(candidates, &budget);
        assert!(selected.is_empty());
    }

    #[test]
    fn test_select_within_budget_sorts_by_score() {
        let candidates = vec![
            ScoredMemory {
                id: "1".to_string(),
                content: "Low relevance".to_string(),
                title: None,
                score: 0.3,
            },
            ScoredMemory {
                id: "2".to_string(),
                content: "High relevance".to_string(),
                title: None,
                score: 0.9,
            },
            ScoredMemory {
                id: "3".to_string(),
                content: "Medium relevance".to_string(),
                title: None,
                score: 0.6,
            },
        ];

        let budget = ContextBudget::default();
        let selected = select_within_budget(candidates, &budget);

        assert_eq!(selected.len(), 3);
        assert_eq!(selected[0].id, "2");
        assert_eq!(selected[1].id, "3");
        assert_eq!(selected[2].id, "1");
    }

    #[test]
    fn test_select_within_budget_respects_max_memories() {
        let candidates: Vec<_> = (0..10)
            .map(|i| ScoredMemory {
                id: i.to_string(),
                content: "Short content".to_string(),
                title: None,
                score: 1.0 - (i as f64 * 0.1),
            })
            .collect();

        let budget = ContextBudget {
            max_tokens: 10000,
            max_memories: 3,
            max_per_memory: 1000,
            reserve_ratio: 0.2,
        };

        let selected = select_within_budget(candidates, &budget);
        assert_eq!(selected.len(), 3);
    }

    #[test]
    fn test_select_within_budget_respects_token_limit() {
        let candidates = vec![
            ScoredMemory {
                id: "1".to_string(),
                content: "Word ".repeat(50),
                title: None,
                score: 0.9,
            },
            ScoredMemory {
                id: "2".to_string(),
                content: "Word ".repeat(50),
                title: None,
                score: 0.8,
            },
            ScoredMemory {
                id: "3".to_string(),
                content: "Word ".repeat(50),
                title: None,
                score: 0.7,
            },
        ];

        let budget = ContextBudget {
            max_tokens: 100,
            max_memories: 10,
            max_per_memory: 100,
            reserve_ratio: 0.2,
        };

        let selected = select_within_budget(candidates, &budget);
        assert!(selected.len() <= 2);
    }

    #[test]
    fn test_scored_memory_clone() {
        let memory = ScoredMemory {
            id: "test".to_string(),
            content: "content".to_string(),
            title: Some("title".to_string()),
            score: 0.5,
        };

        let cloned = memory.clone();
        assert_eq!(cloned.id, memory.id);
        assert_eq!(cloned.content, memory.content);
        assert_eq!(cloned.score, memory.score);
    }
}
