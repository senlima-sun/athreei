//! Application state management
//!
//! Provides thread-safe state containers for Tauri dependency injection.

use std::path::Path;
use std::sync::Mutex;

use crate::storage::Database;

/// Thread-safe database state for Tauri commands
///
/// Wraps a Database connection in a Mutex for safe concurrent access.
pub struct DatabaseState {
    /// The database connection protected by a Mutex
    pub db: Mutex<Database>,
}

impl DatabaseState {
    /// Create a new DatabaseState at the specified path
    ///
    /// # Arguments
    /// * `app_dir` - Path to the application data directory
    ///
    /// # Returns
    /// A new DatabaseState with an initialized database
    ///
    /// # Errors
    /// Returns an error if the database cannot be created or initialized
    pub fn new(app_dir: &Path) -> Result<Self, String> {
        // Ensure the directory exists
        std::fs::create_dir_all(app_dir)
            .map_err(|e| format!("Failed to create app directory: {e}"))?;

        let db_path = app_dir.join("aiii.db");
        let db =
            Database::new(&db_path).map_err(|e| format!("Failed to create database: {e}"))?;

        db.init_schema()
            .map_err(|e| format!("Failed to initialize schema: {e}"))?;

        Ok(Self { db: Mutex::new(db) })
    }

    /// Create a DatabaseState with an in-memory database
    ///
    /// Useful for testing purposes.
    #[cfg(test)]
    pub fn in_memory() -> Result<Self, String> {
        let db = Database::in_memory().map_err(|e| format!("Failed to create database: {e}"))?;

        db.init_schema()
            .map_err(|e| format!("Failed to initialize schema: {e}"))?;

        Ok(Self { db: Mutex::new(db) })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_state_in_memory() {
        let state = DatabaseState::in_memory().unwrap();

        // Verify database is accessible
        let db_guard = state.db.lock().unwrap();
        let spaces = db_guard.list_spaces().unwrap();
        assert!(spaces.is_empty());
    }
}
