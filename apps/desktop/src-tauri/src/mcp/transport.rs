//! MCP Transport layer
//!
//! Handles stdio transport for the MCP server using rmcp.

use rmcp::ServiceExt;
use std::sync::Arc;

use super::handler::AiiiHandler;
use crate::encryption::VaultState;
use crate::state::DatabaseState;

/// Run the MCP server with stdio transport
///
/// This function blocks until the server is shut down via the shutdown channel.
pub async fn run_stdio_server(
    db: Arc<DatabaseState>,
    vault: Arc<VaultState>,
    mut shutdown_rx: tokio::sync::mpsc::Receiver<()>,
) -> Result<(), String> {
    eprintln!("[aiii-mcp] Starting MCP server with stdio transport");

    // Create the handler
    let handler = AiiiHandler::new(db, vault);

    // Create the stdio transport (returns a tuple of (stdin, stdout))
    let transport = rmcp::transport::io::stdio();

    // Run the server - serve() returns a RunningService on success
    let running = handler
        .serve(transport)
        .await
        .map_err(|e| format!("Failed to start MCP server: {e}"))?;

    eprintln!("[aiii-mcp] MCP server running, waiting for shutdown...");

    // Get the cancellation token before we potentially move running
    let ct = running.cancellation_token();

    // Wait for shutdown signal or server completion
    tokio::select! {
        result = running.waiting() => {
            match result {
                Ok(reason) => {
                    eprintln!("[aiii-mcp] MCP server completed: {:?}", reason);
                    Ok(())
                }
                Err(e) => {
                    eprintln!("[aiii-mcp] MCP server error: {e}");
                    Err(format!("MCP server error: {e}"))
                }
            }
        }
        _ = shutdown_rx.recv() => {
            eprintln!("[aiii-mcp] MCP server shutdown requested");
            ct.cancel();
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    // Transport tests would require mocking stdin/stdout
    // which is complex - tested via integration tests instead
}
