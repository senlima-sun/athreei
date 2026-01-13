//! Context formatting
//!
//! Formats scored memories into various output formats for AI consumption
//! (Markdown, JSON, Plain text).

use crate::context::ScoredMemory;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub enum ContextFormat {
    #[default]
    Markdown,
    Json,
    Plain,
}

pub fn format_as_markdown(memories: &[ScoredMemory]) -> String {
    if memories.is_empty() {
        return "## Relevant Context (0 memories)\n\nNo relevant memories found.".to_string();
    }

    let mut output = format!("## Relevant Context ({} memories)\n\n", memories.len());

    for (idx, memory) in memories.iter().enumerate() {
        let title = memory.title.as_deref().unwrap_or("Untitled").trim();

        output.push_str(&format!(
            "{}. **[{}]** (id: {})\n",
            idx + 1,
            title,
            memory.id
        ));
        output.push_str(&format!("   - Relevance: {:.2}\n", memory.score));
        output.push_str(&format!("   - Content: {}\n", memory.content.trim()));

        if idx < memories.len() - 1 {
            output.push('\n');
        }
    }

    output
}

pub fn format_as_json(memories: &[ScoredMemory]) -> String {
    #[derive(Serialize)]
    struct JsonMemory {
        id: String,
        title: String,
        content: String,
        relevance: f64,
    }

    #[derive(Serialize)]
    struct JsonOutput {
        count: usize,
        memories: Vec<JsonMemory>,
    }

    let json_memories: Vec<JsonMemory> = memories
        .iter()
        .map(|m| JsonMemory {
            id: m.id.clone(),
            title: m.title.as_deref().unwrap_or("Untitled").to_string(),
            content: m.content.clone(),
            relevance: m.score,
        })
        .collect();

    let output = JsonOutput {
        count: json_memories.len(),
        memories: json_memories,
    };

    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

pub fn format_as_plain(memories: &[ScoredMemory]) -> String {
    if memories.is_empty() {
        return "No relevant memories found.".to_string();
    }

    memories
        .iter()
        .map(|memory| {
            let title = memory.title.as_deref().unwrap_or("Untitled").trim();
            format!("[{}]\n{}", title, memory.content.trim())
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

pub fn format_context(memories: &[ScoredMemory], format: ContextFormat) -> String {
    match format {
        ContextFormat::Markdown => format_as_markdown(memories),
        ContextFormat::Json => format_as_json(memories),
        ContextFormat::Plain => format_as_plain(memories),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_memories() -> Vec<ScoredMemory> {
        vec![
            ScoredMemory {
                id: "abc123".to_string(),
                content: "This is the first memory content.".to_string(),
                title: Some("First Memory".to_string()),
                score: 0.87,
            },
            ScoredMemory {
                id: "def456".to_string(),
                content: "This is the second memory content.".to_string(),
                title: Some("Second Memory".to_string()),
                score: 0.72,
            },
            ScoredMemory {
                id: "ghi789".to_string(),
                content: "This is the third memory content.".to_string(),
                title: None,
                score: 0.65,
            },
        ]
    }

    #[test]
    fn test_context_format_default() {
        let format = ContextFormat::default();
        assert!(matches!(format, ContextFormat::Markdown));
    }

    #[test]
    fn test_format_as_markdown_empty() {
        let memories = vec![];
        let output = format_as_markdown(&memories);
        assert!(output.contains("0 memories"));
        assert!(output.contains("No relevant memories found"));
    }

    #[test]
    fn test_format_as_markdown_with_memories() {
        let memories = sample_memories();
        let output = format_as_markdown(&memories);

        assert!(output.contains("## Relevant Context (3 memories)"));
        assert!(output.contains("1. **[First Memory]** (id: abc123)"));
        assert!(output.contains("Relevance: 0.87"));
        assert!(output.contains("This is the first memory content."));
        assert!(output.contains("2. **[Second Memory]** (id: def456)"));
        assert!(output.contains("3. **[Untitled]** (id: ghi789)"));
    }

    #[test]
    fn test_format_as_markdown_untitled() {
        let memories = vec![ScoredMemory {
            id: "test123".to_string(),
            content: "Content here".to_string(),
            title: None,
            score: 0.5,
        }];

        let output = format_as_markdown(&memories);
        assert!(output.contains("**[Untitled]**"));
    }

    #[test]
    fn test_format_as_json_empty() {
        let memories = vec![];
        let output = format_as_json(&memories);

        let parsed: serde_json::Value = serde_json::from_str(&output).unwrap();
        assert_eq!(parsed["count"], 0);
        assert_eq!(parsed["memories"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_format_as_json_with_memories() {
        let memories = sample_memories();
        let output = format_as_json(&memories);

        let parsed: serde_json::Value = serde_json::from_str(&output).unwrap();
        assert_eq!(parsed["count"], 3);

        let memories_array = parsed["memories"].as_array().unwrap();
        assert_eq!(memories_array.len(), 3);
        assert_eq!(memories_array[0]["id"], "abc123");
        assert_eq!(memories_array[0]["title"], "First Memory");
        assert_eq!(memories_array[0]["relevance"], 0.87);
        assert_eq!(memories_array[2]["title"], "Untitled");
    }

    #[test]
    fn test_format_as_plain_empty() {
        let memories = vec![];
        let output = format_as_plain(&memories);
        assert_eq!(output, "No relevant memories found.");
    }

    #[test]
    fn test_format_as_plain_with_memories() {
        let memories = sample_memories();
        let output = format_as_plain(&memories);

        assert!(output.contains("[First Memory]"));
        assert!(output.contains("This is the first memory content."));
        assert!(output.contains("[Second Memory]"));
        assert!(output.contains("[Untitled]"));

        let parts: Vec<&str> = output.split("\n\n").collect();
        assert_eq!(parts.len(), 3);
    }

    #[test]
    fn test_format_context_markdown() {
        let memories = sample_memories();
        let output = format_context(&memories, ContextFormat::Markdown);
        assert!(output.contains("## Relevant Context"));
    }

    #[test]
    fn test_format_context_json() {
        let memories = sample_memories();
        let output = format_context(&memories, ContextFormat::Json);

        let parsed: serde_json::Value = serde_json::from_str(&output).unwrap();
        assert!(parsed.get("count").is_some());
    }

    #[test]
    fn test_format_context_plain() {
        let memories = sample_memories();
        let output = format_context(&memories, ContextFormat::Plain);
        assert!(output.contains("[First Memory]"));
        assert!(!output.contains("## Relevant Context"));
    }

    #[test]
    fn test_special_characters_in_content() {
        let memories = vec![ScoredMemory {
            id: "special".to_string(),
            content: r#"Content with "quotes", <tags>, and & symbols"#.to_string(),
            title: Some("Special Chars".to_string()),
            score: 0.5,
        }];

        let markdown = format_as_markdown(&memories);
        assert!(markdown.contains(r#"Content with "quotes""#));

        let json = format_as_json(&memories);
        assert!(serde_json::from_str::<serde_json::Value>(&json).is_ok());

        let plain = format_as_plain(&memories);
        assert!(plain.contains(r#"Content with "quotes""#));
    }
}
