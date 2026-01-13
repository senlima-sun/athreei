//! Trace timing utilities

use std::time::Instant;

use super::types::{TraceEntry, TraceStatus};

/// Timer for measuring tool call duration
pub struct TraceTimer {
    id: String,
    session_id: String,
    tool_name: String,
    started_at: i64,
    start_instant: Instant,
    input_params: Option<serde_json::Value>,
    input_size_bytes: Option<u32>,
}

impl TraceTimer {
    /// Start a new trace timer
    pub fn start(
        session_id: String,
        tool_name: String,
        input: Option<serde_json::Value>,
    ) -> Self {
        let input_size = input.as_ref().map(|v| v.to_string().len() as u32);
        let started_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            session_id,
            tool_name,
            started_at,
            start_instant: Instant::now(),
            input_params: input,
            input_size_bytes: input_size,
        }
    }

    /// Finish the timer with a successful result
    pub fn finish_success(self, output: Option<serde_json::Value>) -> TraceEntry {
        self.finish_with_result(Ok(output))
    }

    /// Finish the timer with an error
    pub fn finish_error(self, error_message: String, error_type: Option<String>) -> TraceEntry {
        let duration_ms = self.start_instant.elapsed().as_millis() as u64;

        TraceEntry {
            id: self.id,
            session_id: self.session_id,
            tool_name: self.tool_name,
            input_params: self.input_params,
            output_result: None,
            started_at: self.started_at,
            duration_ms,
            status: TraceStatus::Error,
            error_message: Some(error_message),
            error_type,
            memory_ids: Vec::new(),
            space_ids: Vec::new(),
            input_size_bytes: self.input_size_bytes,
            output_size_bytes: None,
        }
    }

    /// Finish the timer with a timeout
    pub fn finish_timeout(self) -> TraceEntry {
        let duration_ms = self.start_instant.elapsed().as_millis() as u64;

        TraceEntry {
            id: self.id,
            session_id: self.session_id,
            tool_name: self.tool_name,
            input_params: self.input_params,
            output_result: None,
            started_at: self.started_at,
            duration_ms,
            status: TraceStatus::Timeout,
            error_message: Some("Tool call timed out".into()),
            error_type: Some("timeout".into()),
            memory_ids: Vec::new(),
            space_ids: Vec::new(),
            input_size_bytes: self.input_size_bytes,
            output_size_bytes: None,
        }
    }

    /// Finish the timer with a generic result
    pub fn finish_with_result(
        self,
        result: Result<Option<serde_json::Value>, (String, Option<String>)>,
    ) -> TraceEntry {
        let duration_ms = self.start_instant.elapsed().as_millis() as u64;

        match result {
            Ok(output) => {
                let output_size = output.as_ref().map(|v| v.to_string().len() as u32);
                TraceEntry {
                    id: self.id,
                    session_id: self.session_id,
                    tool_name: self.tool_name,
                    input_params: self.input_params,
                    output_result: output,
                    started_at: self.started_at,
                    duration_ms,
                    status: TraceStatus::Success,
                    error_message: None,
                    error_type: None,
                    memory_ids: Vec::new(),
                    space_ids: Vec::new(),
                    input_size_bytes: self.input_size_bytes,
                    output_size_bytes: output_size,
                }
            }
            Err((message, error_type)) => TraceEntry {
                id: self.id,
                session_id: self.session_id,
                tool_name: self.tool_name,
                input_params: self.input_params,
                output_result: None,
                started_at: self.started_at,
                duration_ms,
                status: TraceStatus::Error,
                error_message: Some(message),
                error_type,
                memory_ids: Vec::new(),
                space_ids: Vec::new(),
                input_size_bytes: self.input_size_bytes,
                output_size_bytes: None,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;

    #[test]
    fn test_timer_success() {
        let timer = TraceTimer::start(
            "session-1".into(),
            "test_tool".into(),
            Some(serde_json::json!({"key": "value"})),
        );

        sleep(Duration::from_millis(10));

        let entry = timer.finish_success(Some(serde_json::json!({"result": "ok"})));

        assert_eq!(entry.session_id, "session-1");
        assert_eq!(entry.tool_name, "test_tool");
        assert_eq!(entry.status, TraceStatus::Success);
        assert!(entry.duration_ms >= 10);
        assert!(entry.input_size_bytes.is_some());
        assert!(entry.output_size_bytes.is_some());
    }

    #[test]
    fn test_timer_error() {
        let timer = TraceTimer::start("session-1".into(), "test_tool".into(), None);

        let entry = timer.finish_error("Something went wrong".into(), Some("TestError".into()));

        assert_eq!(entry.status, TraceStatus::Error);
        assert_eq!(entry.error_message, Some("Something went wrong".into()));
        assert_eq!(entry.error_type, Some("TestError".into()));
    }
}
