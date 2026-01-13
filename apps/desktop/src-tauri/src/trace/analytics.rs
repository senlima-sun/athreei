//! Trace analytics queries

use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Tool usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUsageStat {
    pub tool_name: String,
    pub call_count: u64,
    pub error_count: u64,
    pub avg_duration_ms: f64,
    pub total_duration_ms: u64,
}

/// Session summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub total_tool_calls: u32,
    pub total_errors: u32,
    pub total_duration_ms: u64,
    pub tools_used: Vec<String>,
    pub error_rate: f64,
}

/// Overall trace analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceAnalytics {
    pub period_days: u32,
    pub total_sessions: u64,
    pub total_tool_calls: u64,
    pub total_errors: u64,
    pub overall_error_rate: f64,
    pub tool_usage: Vec<ToolUsageStat>,
}

pub struct TraceAnalyticsDb;

impl TraceAnalyticsDb {
    /// Get tool usage stats over a time period
    pub fn get_tool_usage_stats(conn: &Connection, days: u32) -> Result<Vec<ToolUsageStat>> {
        let cutoff = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (days as i64 * 24 * 60 * 60);

        let mut stmt = conn.prepare(
            "SELECT
                tool_name,
                COUNT(*) as call_count,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
                AVG(duration_ms) as avg_duration_ms,
                SUM(duration_ms) as total_duration_ms
             FROM traces
             WHERE started_at >= ?1
             GROUP BY tool_name
             ORDER BY call_count DESC",
        )?;

        let stats = stmt
            .query_map(params![cutoff], |row| {
                Ok(ToolUsageStat {
                    tool_name: row.get(0)?,
                    call_count: row.get::<_, i64>(1)? as u64,
                    error_count: row.get::<_, i64>(2)? as u64,
                    avg_duration_ms: row.get(3)?,
                    total_duration_ms: row.get::<_, i64>(4)? as u64,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(stats)
    }

    /// Get error rate by tool
    pub fn get_error_rates(conn: &Connection, days: u32) -> Result<HashMap<String, f64>> {
        let cutoff = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (days as i64 * 24 * 60 * 60);

        let mut stmt = conn.prepare(
            "SELECT
                tool_name,
                CAST(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as error_rate
             FROM traces
             WHERE started_at >= ?1
             GROUP BY tool_name",
        )?;

        let rates = stmt
            .query_map(params![cutoff], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
            })?
            .collect::<Result<HashMap<_, _>>>()?;

        Ok(rates)
    }

    /// Get session summary
    pub fn get_session_summary(conn: &Connection, session_id: &str) -> Result<Option<SessionSummary>> {
        let mut stmt = conn.prepare(
            "SELECT
                s.id, s.started_at, s.ended_at, s.total_tool_calls, s.total_errors, s.total_duration_ms
             FROM sessions s
             WHERE s.id = ?1",
        )?;

        let session = stmt
            .query_row(params![session_id], |row| {
                let total_calls: i32 = row.get(3)?;
                let total_errors: i32 = row.get(4)?;
                let error_rate = if total_calls > 0 {
                    total_errors as f64 / total_calls as f64
                } else {
                    0.0
                };

                Ok(SessionSummary {
                    session_id: row.get(0)?,
                    started_at: row.get(1)?,
                    ended_at: row.get(2)?,
                    total_tool_calls: total_calls as u32,
                    total_errors: total_errors as u32,
                    total_duration_ms: row.get::<_, i64>(5)? as u64,
                    tools_used: Vec::new(),
                    error_rate,
                })
            })
            .optional()?;

        if let Some(mut summary) = session {
            let mut tools_stmt = conn.prepare(
                "SELECT DISTINCT tool_name FROM traces WHERE session_id = ?1",
            )?;

            summary.tools_used = tools_stmt
                .query_map(params![session_id], |row| row.get(0))?
                .collect::<Result<Vec<_>>>()?;

            Ok(Some(summary))
        } else {
            Ok(None)
        }
    }

    /// Get overall analytics for a time period
    pub fn get_analytics(conn: &Connection, days: u32) -> Result<TraceAnalytics> {
        let cutoff = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (days as i64 * 24 * 60 * 60);

        let (total_sessions, total_tool_calls, total_errors): (i64, i64, i64) = conn.query_row(
            "SELECT
                (SELECT COUNT(*) FROM sessions WHERE started_at >= ?1),
                (SELECT COUNT(*) FROM traces WHERE started_at >= ?1),
                (SELECT COUNT(*) FROM traces WHERE started_at >= ?1 AND status = 'error')",
            params![cutoff],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;

        let tool_usage = Self::get_tool_usage_stats(conn, days)?;

        let overall_error_rate = if total_tool_calls > 0 {
            total_errors as f64 / total_tool_calls as f64
        } else {
            0.0
        };

        Ok(TraceAnalytics {
            period_days: days,
            total_sessions: total_sessions as u64,
            total_tool_calls: total_tool_calls as u64,
            total_errors: total_errors as u64,
            overall_error_rate,
            tool_usage,
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
    fn test_empty_analytics() {
        let conn = setup_test_db();
        let analytics = TraceAnalyticsDb::get_analytics(&conn, 7).unwrap();

        assert_eq!(analytics.total_sessions, 0);
        assert_eq!(analytics.total_tool_calls, 0);
        assert!(analytics.tool_usage.is_empty());
    }
}
