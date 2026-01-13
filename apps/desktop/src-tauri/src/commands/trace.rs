//! Trace-related Tauri commands

use std::sync::Arc;
use tauri::State;

use crate::state::DatabaseState;
use crate::trace::{SessionSummary, TraceAnalytics, TraceAnalyticsDb, TraceCollectorState, TraceDb};

#[tauri::command]
pub async fn get_trace_analytics(
    db: State<'_, Arc<DatabaseState>>,
    days: Option<u32>,
) -> Result<TraceAnalytics, String> {
    let days = days.unwrap_or(7);

    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let guard = db.db.lock().map_err(|e| format!("Lock error: {e}"))?;
        TraceAnalyticsDb::get_analytics(guard.connection(), days)
            .map_err(|e| format!("Query error: {e}"))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn get_session_summary(
    db: State<'_, Arc<DatabaseState>>,
    session_id: String,
) -> Result<Option<SessionSummary>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let guard = db.db.lock().map_err(|e| format!("Lock error: {e}"))?;
        TraceAnalyticsDb::get_session_summary(guard.connection(), &session_id)
            .map_err(|e| format!("Query error: {e}"))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn get_recent_sessions(
    db: State<'_, Arc<DatabaseState>>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<crate::trace::SessionState>, String> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);

    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let guard = db.db.lock().map_err(|e| format!("Lock error: {e}"))?;
        TraceDb::get_recent_sessions(guard.connection(), limit, offset)
            .map_err(|e| format!("Query error: {e}"))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn get_session_traces(
    db: State<'_, Arc<DatabaseState>>,
    session_id: String,
) -> Result<Vec<crate::trace::TraceEntry>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let guard = db.db.lock().map_err(|e| format!("Lock error: {e}"))?;
        TraceDb::get_session_traces(guard.connection(), &session_id)
            .map_err(|e| format!("Query error: {e}"))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn cleanup_traces(
    trace_collector: State<'_, Arc<TraceCollectorState>>,
    retention_days: Option<u32>,
) -> Result<usize, String> {
    let days = retention_days.unwrap_or(30);
    trace_collector.collector.cleanup_old_traces(days).await
}
