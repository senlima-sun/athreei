//! MCP Server state management for Tauri
//!
//! Provides thread-safe state management for the MCP server lifecycle,
//! including start, stop, and status operations.

use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use crate::encryption::VaultState;
use crate::state::DatabaseState;

use super::transport::run_stdio_server;

/// Server status information
#[derive(Debug, Clone, serde::Serialize)]
pub struct McpStatus {
    /// Whether the server is currently running
    pub running: bool,
    /// Port number if using HTTP transport (None for stdio)
    pub port: Option<u16>,
    /// Transport type being used
    pub transport: String,
}

/// Thread-safe state container for the MCP server
///
/// Manages the server lifecycle and provides safe access from Tauri commands.
/// Holds Arc references to database and vault state for server operations.
pub struct McpServerState {
    /// Database state for memory operations
    db: Arc<DatabaseState>,
    /// Vault state for encryption/decryption
    vault: Arc<VaultState>,
    /// Whether the server is currently running
    running: Arc<RwLock<bool>>,
    /// Shutdown signal sender
    shutdown_tx: Arc<RwLock<Option<mpsc::Sender<()>>>>,
    /// Port number for HTTP transport (future use)
    port: Arc<RwLock<Option<u16>>>,
    /// Current transport type
    transport: Arc<RwLock<String>>,
}

impl McpServerState {
    /// Create a new server state with shared database and vault state
    ///
    /// # Arguments
    /// * `db` - Shared database state
    /// * `vault` - Shared vault state
    pub fn new(db: Arc<DatabaseState>, vault: Arc<VaultState>) -> Self {
        Self {
            db,
            vault,
            running: Arc::new(RwLock::new(false)),
            shutdown_tx: Arc::new(RwLock::new(None)),
            port: Arc::new(RwLock::new(None)),
            transport: Arc::new(RwLock::new("stdio".to_string())),
        }
    }

    /// Check if the server is currently running
    pub async fn is_running(&self) -> bool {
        *self.running.read().await
    }

    /// Get the current server status
    pub async fn status(&self) -> McpStatus {
        McpStatus {
            running: *self.running.read().await,
            port: *self.port.read().await,
            transport: self.transport.read().await.clone(),
        }
    }

    /// Check if the vault is unlocked
    pub fn is_vault_unlocked(&self) -> bool {
        self.vault.is_unlocked()
    }

    /// Start the MCP server with stdio transport
    ///
    /// # Returns
    /// Ok(()) if the server started successfully, Err with message otherwise
    pub async fn start(&self) -> Result<(), String> {
        // Check if already running
        if *self.running.read().await {
            return Err("MCP server is already running".to_string());
        }

        // Check vault is unlocked
        if !self.vault.is_unlocked() {
            return Err(
                "Cannot start MCP server: vault is locked. Please unlock it first.".to_string(),
            );
        }

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);

        // Store shutdown sender
        *self.shutdown_tx.write().await = Some(shutdown_tx);

        // Update state
        *self.running.write().await = true;
        *self.transport.write().await = "stdio".to_string();

        // Clone state refs for the spawned task
        let running = self.running.clone();
        let shutdown_tx_ref = self.shutdown_tx.clone();
        let db = self.db.clone();
        let vault = self.vault.clone();

        // Spawn the server task
        tokio::spawn(async move {
            let result = run_stdio_server(db, vault, shutdown_rx).await;

            // Update state when server stops
            *running.write().await = false;
            *shutdown_tx_ref.write().await = None;

            if let Err(e) = result {
                eprintln!("[aiii-mcp] Server error: {e}");
            }
        });

        Ok(())
    }

    /// Stop the MCP server
    ///
    /// # Returns
    /// Ok(()) if the server stopped successfully, Err with message otherwise
    pub async fn stop(&self) -> Result<(), String> {
        // Check if running
        if !*self.running.read().await {
            return Err("MCP server is not running".to_string());
        }

        // Send shutdown signal
        let shutdown_tx = self.shutdown_tx.read().await;
        if let Some(tx) = shutdown_tx.as_ref() {
            tx.send(())
                .await
                .map_err(|e| format!("Failed to send shutdown signal: {e}"))?;
        }

        // State will be updated by the spawned task when it exits
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;

    fn create_test_state() -> McpServerState {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });
        let vault_state = Arc::new(VaultState::new());

        McpServerState::new(db_state, vault_state)
    }

    #[tokio::test]
    async fn test_initial_state() {
        let state = create_test_state();

        assert!(!state.is_running().await);

        let status = state.status().await;
        assert!(!status.running);
        assert!(status.port.is_none());
        assert_eq!(status.transport, "stdio");
    }

    #[tokio::test]
    async fn test_stop_when_not_running() {
        let state = create_test_state();
        let result = state.stop().await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not running"));
    }

    #[tokio::test]
    async fn test_start_with_locked_vault() {
        let state = create_test_state();

        // Vault is locked by default
        let result = state.start().await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("vault is locked"));
    }
}
