//! Vault-related Tauri commands
//!
//! Provides commands for vault setup, unlock, lock, and status checking.

use std::sync::Arc;
use tauri::State;

use crate::encryption::{VaultState, SALT_LENGTH};
use crate::state::DatabaseState;

/// Unlock the vault with a passphrase
///
/// If this is a new vault (first unlock), a new salt will be generated
/// and stored in the database. For existing vaults, the stored salt
/// will be used for key derivation.
#[tauri::command]
pub async fn vault_unlock(
    passphrase: String,
    vault: State<'_, Arc<VaultState>>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    // Try to load existing salt from database
    let existing_salt = {
        let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;
        load_salt(&db_guard).map_err(|e| format!("Failed to load salt: {e}"))?
    };

    if let Some(salt) = existing_salt {
        // Unlock with existing salt
        let vault_with_salt = VaultState::with_salt(salt);
        vault_with_salt
            .unlock(&passphrase)
            .map_err(|e| format!("Failed to unlock vault: {e}"))?;

        // Copy the unlocked state to the managed vault
        vault.unlock(&passphrase).map_err(|e| format!("Failed to unlock vault: {e}"))?;
    } else {
        // First-time setup: unlock creates new salt
        let new_salt = vault
            .unlock(&passphrase)
            .map_err(|e| format!("Failed to unlock vault: {e}"))?;

        // Store the salt in database
        let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;
        store_salt(&db_guard, &new_salt).map_err(|e| format!("Failed to store salt: {e}"))?;
    }

    Ok(())
}

/// Lock the vault, clearing the encryption key from memory
#[tauri::command]
pub async fn vault_lock(vault: State<'_, Arc<VaultState>>) -> Result<(), String> {
    vault.lock();
    Ok(())
}

/// Check if the vault is currently unlocked
#[tauri::command]
pub async fn vault_status(vault: State<'_, Arc<VaultState>>) -> Result<bool, String> {
    Ok(vault.is_unlocked())
}

/// Set up a new vault with a passphrase
///
/// This should only be called when no vault exists yet.
/// It generates a new salt and stores it in the database.
#[tauri::command]
pub async fn vault_setup(
    passphrase: String,
    vault: State<'_, Arc<VaultState>>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    // Check if vault is already set up
    let existing_salt = {
        let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;
        load_salt(&db_guard).map_err(|e| format!("Failed to check vault status: {e}"))?
    };

    if existing_salt.is_some() {
        return Err("Vault is already set up".to_string());
    }

    // Generate new salt and unlock
    let new_salt = vault
        .unlock(&passphrase)
        .map_err(|e| format!("Failed to set up vault: {e}"))?;

    // Store the salt in database
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;
    store_salt(&db_guard, &new_salt).map_err(|e| format!("Failed to store salt: {e}"))?;

    Ok(())
}

/// Check if a vault has been set up (salt exists in database)
#[tauri::command]
pub async fn vault_is_setup(db: State<'_, Arc<DatabaseState>>) -> Result<bool, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;
    let salt = load_salt(&db_guard).map_err(|e| format!("Failed to check vault status: {e}"))?;
    Ok(salt.is_some())
}

// ==================== Salt Storage Helpers ====================

/// Table for storing vault configuration
const VAULT_CONFIG_TABLE: &str = r#"
    CREATE TABLE IF NOT EXISTS vault_config (
        key TEXT PRIMARY KEY NOT NULL,
        value BLOB NOT NULL
    );
"#;

/// Initialize vault config table if it doesn't exist
fn ensure_vault_config_table(conn: &crate::storage::Database) -> Result<(), rusqlite::Error> {
    conn.connection().execute_batch(VAULT_CONFIG_TABLE)?;
    Ok(())
}

/// Store salt in the database
fn store_salt(
    db: &crate::storage::Database,
    salt: &[u8; SALT_LENGTH],
) -> Result<(), rusqlite::Error> {
    ensure_vault_config_table(db)?;

    db.connection().execute(
        "INSERT OR REPLACE INTO vault_config (key, value) VALUES ('salt', ?1)",
        rusqlite::params![salt.as_slice()],
    )?;

    Ok(())
}

/// Load salt from the database
fn load_salt(db: &crate::storage::Database) -> Result<Option<[u8; SALT_LENGTH]>, rusqlite::Error> {
    ensure_vault_config_table(db)?;

    let mut stmt = db
        .connection()
        .prepare("SELECT value FROM vault_config WHERE key = 'salt'")?;

    let result = stmt.query_row([], |row| {
        let bytes: Vec<u8> = row.get(0)?;
        Ok(bytes)
    });

    match result {
        Ok(bytes) => {
            if bytes.len() == SALT_LENGTH {
                let mut salt = [0u8; SALT_LENGTH];
                salt.copy_from_slice(&bytes);
                Ok(Some(salt))
            } else {
                Ok(None)
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;

    #[test]
    fn test_salt_storage_roundtrip() {
        let db = Database::in_memory().unwrap();
        let salt = [42u8; SALT_LENGTH];

        store_salt(&db, &salt).unwrap();
        let loaded = load_salt(&db).unwrap();

        assert_eq!(loaded, Some(salt));
    }

    #[test]
    fn test_load_nonexistent_salt() {
        let db = Database::in_memory().unwrap();
        let loaded = load_salt(&db).unwrap();
        assert_eq!(loaded, None);
    }
}
