//! Trace collector for MCP tool calls

use std::sync::Arc;
use tokio::sync::RwLock;

use crate::state::DatabaseState;

use super::db::TraceDb;
use super::privacy::sanitize_payload;
use super::types::{EndReason, SessionState, TraceEntry};

/// Collector for MCP tool call traces
///
/// Provides non-blocking trace recording with session management.
/// All write operations are spawned as background tasks to avoid
/// blocking tool execution.
pub struct TraceCollector {
    db: Arc<DatabaseState>,
    current_session: RwLock<Option<SessionState>>,
}

impl TraceCollector {
    /// Create a new TraceCollector
    pub fn new(db: Arc<DatabaseState>) -> Self {
        Self {
            db,
            current_session: RwLock::new(None),
        }
    }

    /// Start a new session
    ///
    /// Creates a new session record in the database.
    /// Returns the session ID.
    pub async fn start_session(
        &self,
        client_name: Option<String>,
        client_version: Option<String>,
    ) -> String {
        let session = SessionState::new(nanoid::nanoid!(), client_name, client_version);
        let session_id = session.id.clone();

        // Store in database
        let db = self.db.clone();
        let session_clone = session.clone();
        tokio::spawn(async move {
            if let Ok(guard) = db.db.lock() {
                if let Err(e) = TraceDb::insert_session(guard.connection(), &session_clone) {
                    eprintln!("Failed to insert session: {e}");
                }
            }
        });

        // Update current session
        let mut current = self.current_session.write().await;
        *current = Some(session);

        session_id
    }

    /// End the current session
    pub async fn end_session(&self, reason: EndReason) {
        let mut current = self.current_session.write().await;

        if let Some(mut session) = current.take() {
            let ended_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            session.ended_at = Some(ended_at);
            session.end_reason = Some(reason);

            let db = self.db.clone();
            let session_id = session.id.clone();
            let total_tool_calls = session.total_tool_calls;
            let total_errors = session.total_errors;
            let total_duration_ms = session.total_duration_ms;

            tokio::spawn(async move {
                if let Ok(guard) = db.db.lock() {
                    if let Err(e) = TraceDb::update_session(
                        guard.connection(),
                        &session_id,
                        ended_at,
                        reason,
                        total_tool_calls,
                        total_errors,
                        total_duration_ms,
                    ) {
                        eprintln!("Failed to update session: {e}");
                    }
                }
            });
        }
    }

    /// Get the current session ID if one exists
    pub async fn get_current_session_id(&self) -> Option<String> {
        let current = self.current_session.read().await;
        current.as_ref().map(|s| s.id.clone())
    }

    /// Check if a session is active
    pub async fn has_active_session(&self) -> bool {
        let current = self.current_session.read().await;
        current.is_some()
    }

    /// Record a trace entry (non-blocking)
    ///
    /// Sanitizes the input/output data and spawns a background task
    /// to write to the database.
    pub async fn record_trace(&self, mut entry: TraceEntry) {
        // Sanitize payloads
        if let Some(ref input) = entry.input_params {
            entry.input_params = Some(sanitize_payload(input));
        }
        if let Some(ref output) = entry.output_result {
            entry.output_result = Some(sanitize_payload(output));
        }

        // Update session stats
        {
            let mut current = self.current_session.write().await;
            if let Some(ref mut session) = *current {
                let is_error = entry.status != super::types::TraceStatus::Success;
                session.record_tool_call(entry.duration_ms, is_error);
            }
        }

        // Write to database in background
        let db = self.db.clone();
        tokio::spawn(async move {
            if let Ok(guard) = db.db.lock() {
                if let Err(e) = TraceDb::insert_trace(guard.connection(), &entry) {
                    eprintln!("Failed to insert trace: {e}");
                }
            }
        });
    }

    /// Ensure a session exists, creating one if needed
    ///
    /// Returns the current session ID, creating a new session if none exists.
    pub async fn ensure_session(&self, client_name: Option<String>) -> String {
        if let Some(id) = self.get_current_session_id().await {
            return id;
        }
        self.start_session(client_name, None).await
    }

    /// Cleanup old traces based on retention policy
    pub async fn cleanup_old_traces(&self, retention_days: u32) -> Result<usize, String> {
        let db = self.db.clone();

        tokio::task::spawn_blocking(move || {
            let guard = db.db.lock().map_err(|e| format!("Lock error: {e}"))?;
            TraceDb::cleanup_old_traces(guard.connection(), retention_days)
                .map_err(|e| format!("Cleanup error: {e}"))
        })
        .await
        .map_err(|e| format!("Task error: {e}"))?
    }
}

/// Thread-safe state wrapper for Tauri
pub struct TraceCollectorState {
    pub collector: TraceCollector,
}

impl TraceCollectorState {
    pub fn new(db: Arc<DatabaseState>) -> Self {
        Self {
            collector: TraceCollector::new(db),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::path::PathBuf;
    use std::sync::Mutex;

    fn create_test_db() -> Arc<DatabaseState> {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        Arc::new(DatabaseState {
            db: Mutex::new(db),
            path: PathBuf::from(":memory:"),
        })
    }

    #[tokio::test]
    async fn test_session_lifecycle() {
        let db = create_test_db();
        let collector = TraceCollector::new(db);

        // No session initially
        assert!(!collector.has_active_session().await);

        // Start session
        let session_id = collector.start_session(Some("test".into()), None).await;
        assert!(!session_id.is_empty());
        assert!(collector.has_active_session().await);

        // End session
        collector.end_session(EndReason::Explicit).await;
        assert!(!collector.has_active_session().await);
    }

    #[tokio::test]
    async fn test_ensure_session() {
        let db = create_test_db();
        let collector = TraceCollector::new(db);

        let id1 = collector.ensure_session(Some("test".into())).await;
        let id2 = collector.ensure_session(None).await;

        assert_eq!(id1, id2);
    }
}
