//! MCP Server implementation
//!
//! This module provides the core MCP server that exposes memory functionality
//! to AI applications through the Model Context Protocol.
//!
//! Note: Full rmcp integration is in progress. This is a placeholder
//! that will be replaced with proper rmcp ServerHandler implementation.

use std::sync::Arc;

use crate::encryption::VaultState;
use crate::state::DatabaseState;

/// Main MCP server for aiii-memory
///
/// Provides tools for AI apps to interact with the local memory store.
#[derive(Clone)]
pub struct AiiiMcpServer {
    db: Arc<DatabaseState>,
    vault: Arc<VaultState>,
}

impl AiiiMcpServer {
    /// Create a new MCP server instance
    pub fn new(db: Arc<DatabaseState>, vault: Arc<VaultState>) -> Self {
        Self { db, vault }
    }

    /// Check if the vault is currently unlocked
    pub fn is_vault_unlocked(&self) -> bool {
        self.vault.is_unlocked()
    }

    /// Get server info
    pub fn get_info(&self) -> ServerInfo {
        ServerInfo {
            name: "aiii-memory".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            description:
                "Personal AI memory layer. Save and retrieve memories across AI conversations."
                    .to_string(),
        }
    }
}

/// Server information
#[derive(Debug, Clone)]
pub struct ServerInfo {
    pub name: String,
    pub version: String,
    pub description: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    fn create_test_server() -> AiiiMcpServer {
        use crate::storage::Database;

        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });
        let vault_state = Arc::new(VaultState::new());

        AiiiMcpServer::new(db_state, vault_state)
    }

    #[test]
    fn test_server_info() {
        let server = create_test_server();
        let info = server.get_info();

        assert_eq!(info.name, "aiii-memory");
    }
}
