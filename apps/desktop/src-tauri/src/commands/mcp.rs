//! MCP server Tauri commands
//!
//! Provides commands for controlling the MCP server from the UI.

use tauri::State;

use crate::mcp::state::McpStatus;
use crate::mcp::McpServerState;

/// Start the MCP server
///
/// Starts the MCP server using stdio transport, making it available
/// to AI applications like Claude Desktop.
///
/// # Returns
/// Ok(()) on success, Err with message on failure
#[tauri::command]
pub async fn mcp_start(mcp_state: State<'_, McpServerState>) -> Result<(), String> {
    mcp_state.start().await
}

/// Stop the MCP server
///
/// Gracefully stops the running MCP server.
///
/// # Returns
/// Ok(()) on success, Err with message on failure
#[tauri::command]
pub async fn mcp_stop(mcp_state: State<'_, McpServerState>) -> Result<(), String> {
    mcp_state.stop().await
}

/// Get the MCP server status
///
/// Returns the current status of the MCP server including whether it's
/// running and what transport it's using.
///
/// # Returns
/// McpStatus containing server state information
#[tauri::command]
pub async fn mcp_status(mcp_state: State<'_, McpServerState>) -> Result<McpStatus, String> {
    Ok(mcp_state.status().await)
}
