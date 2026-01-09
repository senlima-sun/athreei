//! MCP Server implementation
//!
//! This module provides the core MCP server that exposes memory functionality
//! to AI applications through the Model Context Protocol.

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

    fn create_unlocked_test_server() -> AiiiMcpServer {
        use crate::storage::Database;

        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });
        let vault_state = Arc::new(VaultState::new());
        vault_state.unlock("test-passphrase").unwrap();

        AiiiMcpServer::new(db_state, vault_state)
    }

    #[test]
    fn test_server_info() {
        let server = create_test_server();
        let info = server.get_info();

        assert_eq!(info.name, "aiii-memory");
    }

    #[test]
    fn test_server_info_has_version() {
        let server = create_test_server();
        let info = server.get_info();

        assert!(!info.version.is_empty());
        // Version should be in semver format (e.g., "0.1.0")
        assert!(info.version.contains('.'));
    }

    #[test]
    fn test_server_info_has_description() {
        let server = create_test_server();
        let info = server.get_info();

        assert!(!info.description.is_empty());
        assert!(info.description.contains("memory"));
    }

    #[test]
    fn test_vault_locked_by_default() {
        let server = create_test_server();
        assert!(!server.is_vault_unlocked());
    }

    #[test]
    fn test_vault_unlocked_after_unlock() {
        let server = create_unlocked_test_server();
        assert!(server.is_vault_unlocked());
    }

    #[test]
    fn test_server_clone() {
        let server = create_test_server();
        let cloned = server.clone();

        // Both should have same info
        assert_eq!(server.get_info().name, cloned.get_info().name);
        assert_eq!(server.get_info().version, cloned.get_info().version);
    }

    #[test]
    fn test_server_multiple_instances_share_state() {
        use crate::storage::Database;

        // Create shared state
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });
        let vault_state = Arc::new(VaultState::new());

        // Create two servers with shared state
        let server1 = AiiiMcpServer::new(db_state.clone(), vault_state.clone());
        let server2 = AiiiMcpServer::new(db_state, vault_state.clone());

        // Both should be locked initially
        assert!(!server1.is_vault_unlocked());
        assert!(!server2.is_vault_unlocked());

        // Unlock through vault state
        vault_state.unlock("test-passphrase").unwrap();

        // Both servers should now show unlocked
        assert!(server1.is_vault_unlocked());
        assert!(server2.is_vault_unlocked());
    }

    #[test]
    fn test_server_info_matches_cargo_version() {
        let server = create_test_server();
        let info = server.get_info();

        // Version should match Cargo.toml version
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
    }
}
