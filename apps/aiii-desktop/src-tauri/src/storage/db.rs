//! Database wrapper and initialization
//!
//! Handles SQLite connection management and schema initialization.

use rusqlite::{Connection, Result};
use std::path::Path;

/// Schema SQL embedded at compile time
const SCHEMA_SQL: &str = include_str!("schema.sql");

/// Database wrapper providing connection management
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Create a new database connection at the specified path
    ///
    /// # Arguments
    /// * `path` - Path to the SQLite database file
    ///
    /// # Errors
    /// Returns an error if the connection cannot be established
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        // Use WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;

        Ok(Self { conn })
    }

    /// Create an in-memory database (useful for testing)
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(Self { conn })
    }

    /// Initialize the database schema
    ///
    /// Creates all required tables if they don't exist.
    /// This is idempotent and safe to call multiple times.
    ///
    /// # Errors
    /// Returns an error if schema creation fails
    pub fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(SCHEMA_SQL)?;
        Ok(())
    }

    /// Get a reference to the underlying connection
    ///
    /// This should be used sparingly - prefer using repository methods.
    pub fn connection(&self) -> &Connection {
        &self.conn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_database() {
        let db = Database::in_memory().expect("Failed to create in-memory database");
        db.init_schema().expect("Failed to initialize schema");
    }

    #[test]
    fn test_schema_idempotent() {
        let db = Database::in_memory().expect("Failed to create database");
        db.init_schema().expect("First init should succeed");
        db.init_schema().expect("Second init should also succeed");
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let db = Database::in_memory().expect("Failed to create database");
        let fk_enabled: i32 = db
            .connection()
            .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
            .expect("Failed to query foreign_keys");
        assert_eq!(fk_enabled, 1, "Foreign keys should be enabled");
    }
}
