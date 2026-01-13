//! Trace collector module for MCP tool call observability
//!
//! Provides non-blocking trace recording, session management,
//! and analytics for MCP tool calls.

mod analytics;
mod collector;
mod db;
mod privacy;
mod timer;
mod types;

pub use analytics::{SessionSummary, ToolUsageStat, TraceAnalytics, TraceAnalyticsDb};
pub use collector::{TraceCollector, TraceCollectorState};
pub use db::TraceDb;
pub use privacy::{redact_sensitive, sanitize_payload, truncate_payload};
pub use timer::TraceTimer;
pub use types::{EndReason, SessionState, TraceEntry, TraceStatus};
