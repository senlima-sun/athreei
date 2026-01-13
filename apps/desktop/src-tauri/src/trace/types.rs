//! Trace collector data types

use serde::{Deserialize, Serialize};

/// Status of a tool call trace
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TraceStatus {
    Success,
    Error,
    Timeout,
}

impl TraceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Error => "error",
            Self::Timeout => "timeout",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "success" => Some(Self::Success),
            "error" => Some(Self::Error),
            "timeout" => Some(Self::Timeout),
            _ => None,
        }
    }
}

/// Reason for session ending
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EndReason {
    ClientDisconnect,
    Timeout,
    Explicit,
    Error,
}

impl EndReason {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ClientDisconnect => "client_disconnect",
            Self::Timeout => "timeout",
            Self::Explicit => "explicit",
            Self::Error => "error",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "client_disconnect" => Some(Self::ClientDisconnect),
            "timeout" => Some(Self::Timeout),
            "explicit" => Some(Self::Explicit),
            "error" => Some(Self::Error),
            _ => None,
        }
    }
}

/// A single tool call trace entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceEntry {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub input_params: Option<serde_json::Value>,
    pub output_result: Option<serde_json::Value>,
    pub started_at: i64,
    pub duration_ms: u64,
    pub status: TraceStatus,
    pub error_message: Option<String>,
    pub error_type: Option<String>,
    pub memory_ids: Vec<String>,
    pub space_ids: Vec<String>,
    pub input_size_bytes: Option<u32>,
    pub output_size_bytes: Option<u32>,
}

/// Session state for tracking MCP client sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionState {
    pub id: String,
    pub client_name: Option<String>,
    pub client_version: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub last_activity_at: i64,
    pub total_tool_calls: u32,
    pub total_errors: u32,
    pub total_duration_ms: u64,
    pub end_reason: Option<EndReason>,
}

impl SessionState {
    pub fn new(id: String, client_name: Option<String>, client_version: Option<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id,
            client_name,
            client_version,
            started_at: now,
            ended_at: None,
            last_activity_at: now,
            total_tool_calls: 0,
            total_errors: 0,
            total_duration_ms: 0,
            end_reason: None,
        }
    }

    pub fn record_tool_call(&mut self, duration_ms: u64, is_error: bool) {
        self.total_tool_calls += 1;
        self.total_duration_ms += duration_ms;
        if is_error {
            self.total_errors += 1;
        }
        self.last_activity_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
    }
}
