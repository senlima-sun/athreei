//! Key derivation utilities
//!
//! Handles secure key derivation using Argon2id.

use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;

use super::error::VaultError;

/// Argon2 memory cost in KiB (64 MB)
pub const ARGON2_MEMORY_KB: u32 = 65536;

/// Argon2 iteration count
pub const ARGON2_ITERATIONS: u32 = 3;

/// Argon2 parallelism degree
pub const ARGON2_PARALLELISM: u32 = 4;

/// Derived key length in bytes (256 bits)
pub const KEY_LENGTH: usize = 32;

/// Salt length in bytes
pub const SALT_LENGTH: usize = 16;

/// Generate a cryptographically secure random salt
pub fn generate_salt() -> [u8; SALT_LENGTH] {
    let mut salt = [0u8; SALT_LENGTH];
    rand::thread_rng().fill_bytes(&mut salt);
    salt
}

/// Derive a 256-bit key from a passphrase using Argon2id
///
/// Argon2id is a hybrid of Argon2i and Argon2d, providing resistance
/// against both side-channel attacks and GPU cracking.
///
/// # Arguments
/// * `passphrase` - The user's passphrase
/// * `salt` - A unique salt for this derivation
///
/// # Returns
/// A 32-byte (256-bit) derived key suitable for AES-256
pub fn derive_key(passphrase: &str, salt: &[u8]) -> Result<[u8; KEY_LENGTH], VaultError> {
    let params = Params::new(
        ARGON2_MEMORY_KB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(KEY_LENGTH),
    )
    .map_err(|e| VaultError::KeyDerivationFailed(e.to_string()))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; KEY_LENGTH];
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|e| VaultError::KeyDerivationFailed(e.to_string()))?;

    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_salt_uniqueness() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();
        assert_ne!(salt1, salt2);
    }

    #[test]
    fn test_generate_salt_length() {
        let salt = generate_salt();
        assert_eq!(salt.len(), SALT_LENGTH);
    }

    #[test]
    fn test_derive_key_deterministic() {
        let passphrase = "test-passphrase";
        let salt = [0u8; SALT_LENGTH];

        let key1 = derive_key(passphrase, &salt).unwrap();
        let key2 = derive_key(passphrase, &salt).unwrap();

        assert_eq!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_salt() {
        let passphrase = "test-passphrase";
        let salt1 = [0u8; SALT_LENGTH];
        let salt2 = [1u8; SALT_LENGTH];

        let key1 = derive_key(passphrase, &salt1).unwrap();
        let key2 = derive_key(passphrase, &salt2).unwrap();

        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_passphrase() {
        let salt = [0u8; SALT_LENGTH];

        let key1 = derive_key("passphrase1", &salt).unwrap();
        let key2 = derive_key("passphrase2", &salt).unwrap();

        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_length() {
        let key = derive_key("test", &[0u8; SALT_LENGTH]).unwrap();
        assert_eq!(key.len(), KEY_LENGTH);
    }
}
