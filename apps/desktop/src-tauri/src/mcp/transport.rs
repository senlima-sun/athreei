//! MCP Transport layer
//!
//! Handles stdio and HTTP/SSE transports for the MCP server using rmcp.

use axum::Router;
use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, StreamableHttpServerConfig, StreamableHttpService,
};
use rmcp::ServiceExt;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

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

/// Run the MCP server with HTTP/SSE transport
///
/// This function starts an HTTP server and blocks until shutdown.
pub async fn run_http_server(
    db: Arc<DatabaseState>,
    vault: Arc<VaultState>,
    port: u16,
    mut shutdown_rx: tokio::sync::mpsc::Receiver<()>,
) -> Result<(), String> {
    eprintln!("[aiii-mcp] Starting MCP server with HTTP transport on port {port}");

    // Create session manager
    let session_manager = Arc::new(LocalSessionManager::default());

    // Create streamable HTTP service
    let db_clone = db.clone();
    let vault_clone = vault.clone();
    let config = StreamableHttpServerConfig::default();

    let mcp_service = StreamableHttpService::new(
        move || Ok(AiiiHandler::new(db_clone.clone(), vault_clone.clone())),
        session_manager,
        config,
    );

    // CORS layer for browser clients
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Create Axum router with the MCP service as a fallback
    let app = Router::new()
        .fallback_service(mcp_service)
        .layer(cors);

    // Bind to port
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind to port {port}: {e}"))?;

    eprintln!("[aiii-mcp] HTTP server listening on http://127.0.0.1:{port}/mcp");

    // Run server with graceful shutdown
    let server = axum::serve(listener, app);

    tokio::select! {
        result = server => {
            match result {
                Ok(()) => {
                    eprintln!("[aiii-mcp] HTTP server stopped");
                    Ok(())
                }
                Err(e) => {
                    eprintln!("[aiii-mcp] HTTP server error: {e}");
                    Err(format!("HTTP server error: {e}"))
                }
            }
        }
        _ = shutdown_rx.recv() => {
            eprintln!("[aiii-mcp] HTTP server shutdown requested");
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    // Transport tests would require mocking stdin/stdout
    // which is complex - tested via integration tests instead
}
