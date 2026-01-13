//! Privacy controls for trace data

use serde_json::Value;

const MAX_PAYLOAD_BYTES: usize = 10 * 1024;
const SENSITIVE_FIELDS: &[&str] = &[
    "password",
    "secret",
    "token",
    "key",
    "api_key",
    "apikey",
    "auth",
    "authorization",
    "credential",
    "private",
];

/// Truncate a JSON value to fit within max bytes
pub fn truncate_payload(value: &Value, max_bytes: usize) -> Value {
    let serialized = value.to_string();
    if serialized.len() <= max_bytes {
        return value.clone();
    }

    match value {
        Value::String(s) => {
            let truncated = if s.len() > max_bytes - 20 {
                format!("{}...[truncated]", &s[..max_bytes - 20])
            } else {
                s.clone()
            };
            Value::String(truncated)
        }
        Value::Array(arr) => {
            let mut result = Vec::new();
            let mut current_size = 2;

            for item in arr {
                let item_str = item.to_string();
                if current_size + item_str.len() + 1 > max_bytes {
                    result.push(Value::String("[...truncated]".into()));
                    break;
                }
                result.push(item.clone());
                current_size += item_str.len() + 1;
            }

            Value::Array(result)
        }
        Value::Object(obj) => {
            let mut result = serde_json::Map::new();
            let mut current_size = 2;

            for (key, val) in obj {
                let entry_str = format!("\"{}\":{}", key, val);
                if current_size + entry_str.len() + 1 > max_bytes {
                    result.insert("_truncated".into(), Value::Bool(true));
                    break;
                }
                result.insert(key.clone(), val.clone());
                current_size += entry_str.len() + 1;
            }

            Value::Object(result)
        }
        _ => value.clone(),
    }
}

/// Redact sensitive fields in a JSON value
pub fn redact_sensitive(value: &mut Value) {
    match value {
        Value::Object(obj) => {
            for (key, val) in obj.iter_mut() {
                let key_lower = key.to_lowercase();
                if SENSITIVE_FIELDS.iter().any(|&f| key_lower.contains(f)) {
                    *val = Value::String("[REDACTED]".into());
                } else {
                    redact_sensitive(val);
                }
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                redact_sensitive(item);
            }
        }
        _ => {}
    }
}

/// Apply both truncation and redaction to a value
pub fn sanitize_payload(value: &Value) -> Value {
    let mut result = truncate_payload(value, MAX_PAYLOAD_BYTES);
    redact_sensitive(&mut result);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_redact_sensitive_password() {
        let mut value = json!({
            "username": "john",
            "password": "secret123",
            "nested": {
                "api_key": "abc123"
            }
        });

        redact_sensitive(&mut value);

        assert_eq!(value["username"], "john");
        assert_eq!(value["password"], "[REDACTED]");
        assert_eq!(value["nested"]["api_key"], "[REDACTED]");
    }

    #[test]
    fn test_truncate_long_string() {
        let long_string = "a".repeat(20000);
        let value = Value::String(long_string);

        let truncated = truncate_payload(&value, 1000);

        if let Value::String(s) = truncated {
            assert!(s.len() <= 1000);
            assert!(s.ends_with("...[truncated]"));
        } else {
            panic!("Expected string");
        }
    }

    #[test]
    fn test_truncate_array() {
        let value = json!(["item1", "item2", "item3", "item4", "item5"]);

        let truncated = truncate_payload(&value, 30);

        if let Value::Array(arr) = truncated {
            assert!(arr.len() < 5);
        }
    }

    #[test]
    fn test_sanitize_combined() {
        let value = json!({
            "data": "normal",
            "secret_key": "should-be-hidden"
        });

        let sanitized = sanitize_payload(&value);

        assert_eq!(sanitized["data"], "normal");
        assert_eq!(sanitized["secret_key"], "[REDACTED]");
    }
}
