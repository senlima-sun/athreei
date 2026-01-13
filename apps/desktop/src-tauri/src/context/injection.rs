//! Context injection for MCP tool calls
//!
//! Provides automatic context injection for specific tools based on
//! intent extraction and relevance scoring.

use serde_json::Value;

pub const INJECTABLE_TOOLS: &[&str] = &[
    "create_memory",
    "update_memory",
];

pub fn should_inject(tool_name: &str, _intent_confidence: f64) -> bool {
    INJECTABLE_TOOLS.contains(&tool_name)
}

pub fn inject_context_into_arguments(
    arguments: &mut serde_json::Map<String, Value>,
    context: &str,
) {
    arguments.insert("_context".to_string(), Value::String(context.to_string()));
}

pub fn extract_intent_query(arguments: &serde_json::Map<String, Value>) -> Option<String> {
    if let Some(Value::String(title)) = arguments.get("title") {
        return Some(title.clone());
    }

    if let Some(Value::String(content)) = arguments.get("content") {
        let preview = content.chars().take(200).collect::<String>();
        return Some(preview);
    }

    if let Some(Value::String(query)) = arguments.get("query") {
        return Some(query.clone());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_should_inject_create_memory() {
        assert!(should_inject("create_memory", 0.5));
    }

    #[test]
    fn test_should_inject_update_memory() {
        assert!(should_inject("update_memory", 0.5));
    }

    #[test]
    fn test_should_not_inject_unknown_tool() {
        assert!(!should_inject("unknown_tool", 0.5));
        assert!(!should_inject("search_memories", 0.5));
        assert!(!should_inject("get_memory", 0.5));
    }

    #[test]
    fn test_inject_context_into_arguments() {
        let mut args = serde_json::Map::new();
        args.insert("title".to_string(), json!("Test Title"));

        inject_context_into_arguments(&mut args, "Relevant context here");

        assert_eq!(args.get("_context"), Some(&json!("Relevant context here")));
        assert_eq!(args.get("title"), Some(&json!("Test Title")));
    }

    #[test]
    fn test_extract_intent_query_from_title() {
        let args: serde_json::Map<String, Value> =
            serde_json::from_str(r#"{"title": "My Title", "content": "My Content"}"#).unwrap();

        assert_eq!(extract_intent_query(&args), Some("My Title".to_string()));
    }

    #[test]
    fn test_extract_intent_query_from_content() {
        let args: serde_json::Map<String, Value> =
            serde_json::from_str(r#"{"content": "My Content without title"}"#).unwrap();

        assert_eq!(
            extract_intent_query(&args),
            Some("My Content without title".to_string())
        );
    }

    #[test]
    fn test_extract_intent_query_from_query() {
        let args: serde_json::Map<String, Value> =
            serde_json::from_str(r#"{"query": "search query"}"#).unwrap();

        assert_eq!(extract_intent_query(&args), Some("search query".to_string()));
    }

    #[test]
    fn test_extract_intent_query_none() {
        let args: serde_json::Map<String, Value> =
            serde_json::from_str(r#"{"id": "abc123"}"#).unwrap();

        assert_eq!(extract_intent_query(&args), None);
    }

    #[test]
    fn test_extract_intent_query_truncates_long_content() {
        let long_content = "A".repeat(500);
        let args: serde_json::Map<String, Value> =
            serde_json::from_value(json!({"content": long_content})).unwrap();

        let result = extract_intent_query(&args).unwrap();
        assert_eq!(result.len(), 200);
    }
}
