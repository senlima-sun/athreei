//! Trace database operations

use rusqlite::{params, Connection, Result};

use super::types::{EndReason, SessionState, TraceEntry, TraceStatus};

pub struct TraceDb;

impl TraceDb {
    /// Insert a new session
    pub fn insert_session(conn: &Connection, session: &SessionState) -> Result<()> {
        conn.execute(
            "INSERT INTO sessions (id, client_name, client_version, started_at, ended_at, last_activity_at, total_tool_calls, total_errors, total_duration_ms, end_reason)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                session.id,
                session.client_name,
                session.client_version,
                session.started_at,
                session.ended_at,
                session.last_activity_at,
                session.total_tool_calls,
                session.total_errors,
                session.total_duration_ms as i64,
                session.end_reason.map(|r| r.as_str()),
            ],
        )?;
        Ok(())
    }

    /// Update a session with end time and aggregates
    pub fn update_session(
        conn: &Connection,
        id: &str,
        ended_at: i64,
        reason: EndReason,
        total_tool_calls: u32,
        total_errors: u32,
        total_duration_ms: u64,
    ) -> Result<()> {
        conn.execute(
            "UPDATE sessions SET ended_at = ?2, end_reason = ?3, total_tool_calls = ?4, total_errors = ?5, total_duration_ms = ?6
             WHERE id = ?1",
            params![
                id,
                ended_at,
                reason.as_str(),
                total_tool_calls,
                total_errors,
                total_duration_ms as i64,
            ],
        )?;
        Ok(())
    }

    /// Insert a trace entry
    pub fn insert_trace(conn: &Connection, entry: &TraceEntry) -> Result<()> {
        let input_json = entry.input_params.as_ref().map(|v| v.to_string());
        let output_json = entry.output_result.as_ref().map(|v| v.to_string());
        let memory_ids_json = if entry.memory_ids.is_empty() {
            None
        } else {
            Some(serde_json::to_string(&entry.memory_ids).unwrap_or_default())
        };
        let space_ids_json = if entry.space_ids.is_empty() {
            None
        } else {
            Some(serde_json::to_string(&entry.space_ids).unwrap_or_default())
        };

        conn.execute(
            "INSERT INTO traces (id, session_id, tool_name, input_params, output_result, started_at, duration_ms, status, error_message, error_type, memory_ids, space_ids, input_size_bytes, output_size_bytes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                entry.id,
                entry.session_id,
                entry.tool_name,
                input_json,
                output_json,
                entry.started_at,
                entry.duration_ms as i64,
                entry.status.as_str(),
                entry.error_message,
                entry.error_type,
                memory_ids_json,
                space_ids_json,
                entry.input_size_bytes,
                entry.output_size_bytes,
            ],
        )?;
        Ok(())
    }

    /// Get all traces for a session
    pub fn get_session_traces(conn: &Connection, session_id: &str) -> Result<Vec<TraceEntry>> {
        let mut stmt = conn.prepare(
            "SELECT id, session_id, tool_name, input_params, output_result, started_at, duration_ms, status, error_message, error_type, memory_ids, space_ids, input_size_bytes, output_size_bytes
             FROM traces WHERE session_id = ?1 ORDER BY started_at ASC",
        )?;

        let traces = stmt
            .query_map(params![session_id], |row| {
                Self::row_to_trace_entry(row)
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(traces)
    }

    /// Get recent sessions with pagination
    pub fn get_recent_sessions(
        conn: &Connection,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<SessionState>> {
        let mut stmt = conn.prepare(
            "SELECT id, client_name, client_version, started_at, ended_at, last_activity_at, total_tool_calls, total_errors, total_duration_ms, end_reason
             FROM sessions ORDER BY started_at DESC LIMIT ?1 OFFSET ?2",
        )?;

        let sessions = stmt
            .query_map(params![limit as i64, offset as i64], |row| {
                Self::row_to_session_state(row)
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(sessions)
    }

    /// Get a session by ID
    pub fn get_session(conn: &Connection, id: &str) -> Result<Option<SessionState>> {
        let mut stmt = conn.prepare(
            "SELECT id, client_name, client_version, started_at, ended_at, last_activity_at, total_tool_calls, total_errors, total_duration_ms, end_reason
             FROM sessions WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;
        match rows.next()? {
            Some(row) => Ok(Some(Self::row_to_session_state(row)?)),
            None => Ok(None),
        }
    }

    /// Delete traces older than retention period
    pub fn cleanup_old_traces(conn: &Connection, retention_days: u32) -> Result<usize> {
        let cutoff = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (retention_days as i64 * 24 * 60 * 60);

        let deleted = conn.execute(
            "DELETE FROM sessions WHERE started_at < ?1",
            params![cutoff],
        )?;

        Ok(deleted)
    }

    fn row_to_trace_entry(row: &rusqlite::Row) -> Result<TraceEntry> {
        let input_str: Option<String> = row.get(3)?;
        let output_str: Option<String> = row.get(4)?;
        let status_str: String = row.get(7)?;
        let memory_ids_str: Option<String> = row.get(10)?;
        let space_ids_str: Option<String> = row.get(11)?;
        let duration_ms: i64 = row.get(6)?;
        let input_size: Option<i32> = row.get(12)?;
        let output_size: Option<i32> = row.get(13)?;

        Ok(TraceEntry {
            id: row.get(0)?,
            session_id: row.get(1)?,
            tool_name: row.get(2)?,
            input_params: input_str.and_then(|s| serde_json::from_str(&s).ok()),
            output_result: output_str.and_then(|s| serde_json::from_str(&s).ok()),
            started_at: row.get(5)?,
            duration_ms: duration_ms as u64,
            status: TraceStatus::from_str(&status_str).unwrap_or(TraceStatus::Error),
            error_message: row.get(8)?,
            error_type: row.get(9)?,
            memory_ids: memory_ids_str
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            space_ids: space_ids_str
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            input_size_bytes: input_size.map(|v| v as u32),
            output_size_bytes: output_size.map(|v| v as u32),
        })
    }

    fn row_to_session_state(row: &rusqlite::Row) -> Result<SessionState> {
        let end_reason_str: Option<String> = row.get(9)?;
        let total_duration: i64 = row.get(8)?;

        Ok(SessionState {
            id: row.get(0)?,
            client_name: row.get(1)?,
            client_version: row.get(2)?,
            started_at: row.get(3)?,
            ended_at: row.get(4)?,
            last_activity_at: row.get(5)?,
            total_tool_calls: row.get::<_, i32>(6)? as u32,
            total_errors: row.get::<_, i32>(7)? as u32,
            total_duration_ms: total_duration as u64,
            end_reason: end_reason_str.and_then(|s| EndReason::from_str(&s)),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../storage/schema.sql")).unwrap();
        conn
    }

    #[test]
    fn test_insert_and_get_session() {
        let conn = setup_test_db();
        let session = SessionState::new("test-session".into(), Some("test-client".into()), Some("1.0".into()));

        TraceDb::insert_session(&conn, &session).unwrap();

        let retrieved = TraceDb::get_session(&conn, "test-session").unwrap().unwrap();
        assert_eq!(retrieved.id, "test-session");
        assert_eq!(retrieved.client_name, Some("test-client".into()));
    }

    #[test]
    fn test_insert_and_get_trace() {
        let conn = setup_test_db();
        let session = SessionState::new("test-session".into(), None, None);
        TraceDb::insert_session(&conn, &session).unwrap();

        let trace = TraceEntry {
            id: "trace-1".into(),
            session_id: "test-session".into(),
            tool_name: "search_memories".into(),
            input_params: Some(serde_json::json!({"query": "test"})),
            output_result: Some(serde_json::json!({"count": 5})),
            started_at: 1000,
            duration_ms: 50,
            status: TraceStatus::Success,
            error_message: None,
            error_type: None,
            memory_ids: vec!["mem-1".into()],
            space_ids: vec![],
            input_size_bytes: Some(100),
            output_size_bytes: Some(200),
        };

        TraceDb::insert_trace(&conn, &trace).unwrap();

        let traces = TraceDb::get_session_traces(&conn, "test-session").unwrap();
        assert_eq!(traces.len(), 1);
        assert_eq!(traces[0].tool_name, "search_memories");
        assert_eq!(traces[0].memory_ids, vec!["mem-1"]);
    }
}
