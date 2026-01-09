//! Application-level vault state management
//!
//! Provides thread-safe vault state for Tauri commands.

use std::sync::RwLock;

use super::error::VaultError;
use super::key::{generate_salt, SALT_LENGTH};
use super::vault::Vault;

/// Thread-safe vault state for the application
///
/// This struct manages the vault lifecycle and provides
/// a safe interface for encryption operations from Tauri commands.
pub struct VaultState {
    /// The unlocked vault, if any
    inner: RwLock<Option<Vault>>,
    /// The salt used for key derivation
    salt: RwLock<Option<[u8; SALT_LENGTH]>>,
}

impl VaultState {
    /// Create a new locked vault state
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(None),
            salt: RwLock::new(None),
        }
    }

    /// Create a vault state with an existing salt
    ///
    /// Use this when loading a previously created vault from storage.
    pub fn with_salt(salt: [u8; SALT_LENGTH]) -> Self {
        Self {
            inner: RwLock::new(None),
            salt: RwLock::new(Some(salt)),
        }
    }

    /// Unlock the vault with a passphrase
    ///
    /// If no salt exists, a new one will be generated. This is the case
    /// when creating a new vault for the first time.
    ///
    /// # Arguments
    /// * `passphrase` - The user's passphrase
    ///
    /// # Returns
    /// The salt used (either existing or newly generated)
    pub fn unlock(&self, passphrase: &str) -> Result<[u8; SALT_LENGTH], VaultError> {
        let salt = {
            let salt_guard = self.salt.read().map_err(|_| {
                VaultError::KeyDerivationFailed("Failed to acquire salt lock".to_string())
            })?;

            match *salt_guard {
                Some(s) => s,
                None => {
                    drop(salt_guard);
                    let new_salt = generate_salt();
                    let mut salt_write = self.salt.write().map_err(|_| {
                        VaultError::KeyDerivationFailed(
                            "Failed to acquire salt write lock".to_string(),
                        )
                    })?;
                    *salt_write = Some(new_salt);
                    new_salt
                }
            }
        };

        let vault = Vault::unlock(passphrase, &salt)?;

        let mut inner = self.inner.write().map_err(|_| {
            VaultError::KeyDerivationFailed("Failed to acquire vault lock".to_string())
        })?;
        *inner = Some(vault);

        Ok(salt)
    }

    /// Lock the vault, clearing the key from memory
    pub fn lock(&self) {
        if let Ok(mut inner) = self.inner.write() {
            *inner = None;
        }
    }

    /// Check if the vault is currently unlocked
    pub fn is_unlocked(&self) -> bool {
        self.inner
            .read()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
    }

    /// Get the current salt, if any
    pub fn get_salt(&self) -> Option<[u8; SALT_LENGTH]> {
        self.salt.read().ok().and_then(|guard| *guard)
    }

    /// Encrypt data using the unlocked vault
    ///
    /// # Arguments
    /// * `plaintext` - The data to encrypt
    /// * `aad` - Additional authenticated data
    ///
    /// # Returns
    /// Encrypted data (nonce || ciphertext)
    ///
    /// # Errors
    /// Returns `VaultLocked` if the vault is not unlocked
    pub fn encrypt(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, VaultError> {
        let guard = self.inner.read().map_err(|_| {
            VaultError::EncryptionFailed("Failed to acquire vault lock".to_string())
        })?;

        match &*guard {
            Some(vault) => vault.encrypt(plaintext, aad),
            None => Err(VaultError::VaultLocked),
        }
    }

    /// Decrypt data using the unlocked vault
    ///
    /// # Arguments
    /// * `encrypted` - The encrypted data (nonce || ciphertext)
    /// * `aad` - Additional authenticated data
    ///
    /// # Returns
    /// Decrypted plaintext
    ///
    /// # Errors
    /// Returns `VaultLocked` if the vault is not unlocked
    pub fn decrypt(&self, encrypted: &[u8], aad: &[u8]) -> Result<Vec<u8>, VaultError> {
        let guard = self.inner.read().map_err(|_| {
            VaultError::DecryptionFailed("Failed to acquire vault lock".to_string())
        })?;

        match &*guard {
            Some(vault) => vault.decrypt(encrypted, aad),
            None => Err(VaultError::VaultLocked),
        }
    }

    /// Change the vault passphrase
    ///
    /// This creates a new salt and re-initializes the vault with the new passphrase.
    /// The caller is responsible for re-encrypting all existing data.
    ///
    /// # Arguments
    /// * `old_passphrase` - The current passphrase (for verification)
    /// * `new_passphrase` - The new passphrase
    ///
    /// # Returns
    /// The new salt used for key derivation
    ///
    /// # Errors
    /// Returns error if:
    /// - Old passphrase is incorrect
    /// - Vault is locked
    /// - New passphrase is empty
    pub fn change_passphrase(
        &self,
        old_passphrase: &str,
        new_passphrase: &str,
    ) -> Result<[u8; SALT_LENGTH], VaultError> {
        // Validate new passphrase
        if new_passphrase.is_empty() {
            return Err(VaultError::InvalidPassphrase(
                "New passphrase cannot be empty".to_string(),
            ));
        }

        // Check passphrase requirements
        if new_passphrase.len() < 8 {
            return Err(VaultError::InvalidPassphrase(
                "Passphrase must be at least 8 characters".to_string(),
            ));
        }

        // Verify old passphrase by trying to unlock with it
        let old_salt = self.get_salt().ok_or(VaultError::VaultLocked)?;

        // Try to unlock with old passphrase to verify it's correct
        let old_vault = Vault::unlock(old_passphrase, &old_salt)?;

        // Test encryption/decryption with old vault to verify passphrase
        let test_data = b"passphrase_verification_test";
        let test_aad = b"verification";
        let encrypted = old_vault.encrypt(test_data, test_aad)?;
        old_vault.decrypt(&encrypted, test_aad)?;

        // Generate new salt
        let new_salt = generate_salt();

        // Create new vault with new passphrase
        let new_vault = Vault::unlock(new_passphrase, &new_salt)?;

        // Update vault state
        {
            let mut inner = self.inner.write().map_err(|_| {
                VaultError::KeyDerivationFailed("Failed to acquire vault write lock".to_string())
            })?;
            *inner = Some(new_vault);
        }

        {
            let mut salt_guard = self.salt.write().map_err(|_| {
                VaultError::KeyDerivationFailed("Failed to acquire salt write lock".to_string())
            })?;
            *salt_guard = Some(new_salt);
        }

        Ok(new_salt)
    }

    /// Re-encrypt data from old vault to new vault
    ///
    /// This is used during passphrase change to re-encrypt existing data.
    ///
    /// # Arguments
    /// * `encrypted` - Data encrypted with old passphrase
    /// * `old_passphrase` - The old passphrase
    /// * `old_salt` - The salt used with old passphrase
    /// * `aad` - Additional authenticated data (must be same for both operations)
    ///
    /// # Returns
    /// Data re-encrypted with the current vault key
    pub fn re_encrypt(
        &self,
        encrypted: &[u8],
        old_passphrase: &str,
        old_salt: &[u8],
        aad: &[u8],
    ) -> Result<Vec<u8>, VaultError> {
        // Create old vault to decrypt
        let old_vault = Vault::unlock(old_passphrase, old_salt)?;

        // Decrypt with old vault
        let plaintext = old_vault.decrypt(encrypted, aad)?;

        // Encrypt with current vault
        self.encrypt(&plaintext, aad)
    }
}

impl Default for VaultState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_vault_is_locked() {
        let state = VaultState::new();
        assert!(!state.is_unlocked());
    }

    #[test]
    fn test_unlock_creates_vault() {
        let state = VaultState::new();
        state.unlock("test-passphrase").unwrap();
        assert!(state.is_unlocked());
    }

    #[test]
    fn test_lock_clears_vault() {
        let state = VaultState::new();
        state.unlock("test-passphrase").unwrap();
        assert!(state.is_unlocked());

        state.lock();
        assert!(!state.is_unlocked());
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let state = VaultState::new();
        state.unlock("test-passphrase").unwrap();

        let plaintext = b"Secret message";
        let aad = b"context";

        let encrypted = state.encrypt(plaintext, aad).unwrap();
        let decrypted = state.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_while_locked_fails() {
        let state = VaultState::new();
        let result = state.encrypt(b"test", b"");
        assert!(matches!(result, Err(VaultError::VaultLocked)));
    }

    #[test]
    fn test_decrypt_while_locked_fails() {
        let state = VaultState::new();
        let result = state.decrypt(b"test", b"");
        assert!(matches!(result, Err(VaultError::VaultLocked)));
    }

    #[test]
    fn test_unlock_generates_salt() {
        let state = VaultState::new();
        assert!(state.get_salt().is_none());

        state.unlock("test-passphrase").unwrap();
        assert!(state.get_salt().is_some());
    }

    #[test]
    fn test_with_salt_preserves_salt() {
        let salt = [42u8; SALT_LENGTH];
        let state = VaultState::with_salt(salt);

        assert_eq!(state.get_salt(), Some(salt));
    }

    #[test]
    fn test_unlock_returns_salt() {
        let state = VaultState::new();
        let salt = state.unlock("test-passphrase").unwrap();

        assert_eq!(state.get_salt(), Some(salt));
    }

    #[test]
    fn test_relock_preserves_salt() {
        let state = VaultState::new();
        let salt = state.unlock("test-passphrase").unwrap();

        state.lock();
        assert!(!state.is_unlocked());
        assert_eq!(state.get_salt(), Some(salt));
    }

    #[test]
    fn test_same_passphrase_same_salt_decrypts() {
        let state = VaultState::new();
        let salt = state.unlock("test-passphrase").unwrap();

        let plaintext = b"Secret";
        let encrypted = state.encrypt(plaintext, b"").unwrap();

        // Lock and re-unlock with same passphrase
        state.lock();
        let state2 = VaultState::with_salt(salt);
        state2.unlock("test-passphrase").unwrap();

        let decrypted = state2.decrypt(&encrypted, b"").unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
