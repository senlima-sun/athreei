//! Vault error types
//!
//! Defines all error types for the encryption module.

use thiserror::Error;

/// Errors that can occur during vault operations
#[derive(Debug, Error)]
pub enum VaultError {
    /// The provided passphrase is invalid
    #[error("Invalid passphrase")]
    InvalidPassphrase,

    /// Encryption operation failed
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    /// Decryption operation failed
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    /// Key derivation failed
    #[error("Key derivation failed: {0}")]
    KeyDerivationFailed(String),

    /// Vault is locked and requires unlocking
    #[error("Vault is locked")]
    VaultLocked,

    /// Invalid data format
    #[error("Invalid data format: {0}")]
    InvalidFormat(String),
}

impl From<aes_gcm::Error> for VaultError {
    fn from(err: aes_gcm::Error) -> Self {
        VaultError::DecryptionFailed(err.to_string())
    }
}

impl From<argon2::Error> for VaultError {
    fn from(err: argon2::Error) -> Self {
        VaultError::KeyDerivationFailed(err.to_string())
    }
}
