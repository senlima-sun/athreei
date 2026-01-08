//! Vault implementation
//!
//! Provides authenticated encryption using AES-256-GCM.

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use rand::RngCore;

use super::error::VaultError;
use super::key::derive_key;

/// Nonce length in bytes (96 bits for AES-GCM)
pub const NONCE_LENGTH: usize = 12;

/// Vault provides authenticated encryption using AES-256-GCM
///
/// The vault is initialized with a key derived from a user passphrase.
/// All encryption operations use random nonces and support additional
/// authenticated data (AAD) for context binding.
pub struct Vault {
    cipher: Aes256Gcm,
}

impl Vault {
    /// Derive a key from the passphrase and salt, then create a new vault
    ///
    /// # Arguments
    /// * `passphrase` - The user's passphrase
    /// * `salt` - The salt used for key derivation
    ///
    /// # Returns
    /// A new Vault instance ready for encryption/decryption
    pub fn unlock(passphrase: &str, salt: &[u8]) -> Result<Self, VaultError> {
        let key = derive_key(passphrase, salt)?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| VaultError::KeyDerivationFailed(e.to_string()))?;

        Ok(Self { cipher })
    }

    /// Encrypt plaintext with additional authenticated data
    ///
    /// # Arguments
    /// * `plaintext` - The data to encrypt
    /// * `aad` - Additional authenticated data (e.g., memory_id + space_id)
    ///
    /// # Returns
    /// Encrypted data in format: nonce (12 bytes) || ciphertext
    ///
    /// # Security
    /// - Uses a random 96-bit nonce for each encryption
    /// - AAD is authenticated but not encrypted
    pub fn encrypt(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, VaultError> {
        let mut nonce_bytes = [0u8; NONCE_LENGTH];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self
            .cipher
            .encrypt(nonce, aes_gcm::aead::Payload { msg: plaintext, aad })
            .map_err(|e| VaultError::EncryptionFailed(e.to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(NONCE_LENGTH + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt ciphertext with additional authenticated data
    ///
    /// # Arguments
    /// * `encrypted` - The encrypted data (nonce || ciphertext)
    /// * `aad` - Additional authenticated data (must match encryption)
    ///
    /// # Returns
    /// The decrypted plaintext
    ///
    /// # Errors
    /// Returns error if:
    /// - Data is too short (< 12 bytes)
    /// - Authentication fails (wrong key, AAD, or tampered data)
    pub fn decrypt(&self, encrypted: &[u8], aad: &[u8]) -> Result<Vec<u8>, VaultError> {
        if encrypted.len() < NONCE_LENGTH {
            return Err(VaultError::InvalidFormat(format!(
                "Encrypted data too short: {} bytes, minimum {} required",
                encrypted.len(),
                NONCE_LENGTH
            )));
        }

        let nonce = Nonce::from_slice(&encrypted[..NONCE_LENGTH]);
        let ciphertext = &encrypted[NONCE_LENGTH..];

        let plaintext = self
            .cipher
            .decrypt(nonce, aes_gcm::aead::Payload { msg: ciphertext, aad })
            .map_err(|e| VaultError::DecryptionFailed(e.to_string()))?;

        Ok(plaintext)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encryption::key::generate_salt;

    fn create_test_vault() -> (Vault, [u8; 16]) {
        let salt = generate_salt();
        let vault = Vault::unlock("test-passphrase", &salt).unwrap();
        (vault, salt)
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Hello, World!";
        let aad = b"memory_id:123|space_id:456";

        let encrypted = vault.encrypt(plaintext, aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_produces_different_ciphertext() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Same plaintext";
        let aad = b"";

        let encrypted1 = vault.encrypt(plaintext, aad).unwrap();
        let encrypted2 = vault.encrypt(plaintext, aad).unwrap();

        // Different nonces should produce different ciphertext
        assert_ne!(encrypted1, encrypted2);
    }

    #[test]
    fn test_decrypt_with_wrong_aad_fails() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret data";
        let aad1 = b"correct_aad";
        let aad2 = b"wrong_aad";

        let encrypted = vault.encrypt(plaintext, aad1).unwrap();
        let result = vault.decrypt(&encrypted, aad2);

        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_with_tampered_data_fails() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret data";
        let aad = b"";

        let mut encrypted = vault.encrypt(plaintext, aad).unwrap();
        // Tamper with the ciphertext
        if let Some(last) = encrypted.last_mut() {
            *last ^= 0xFF;
        }

        let result = vault.decrypt(&encrypted, aad);
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_with_short_data_fails() {
        let (vault, _) = create_test_vault();

        let result = vault.decrypt(&[0u8; 5], b"");
        assert!(matches!(result, Err(VaultError::InvalidFormat(_))));
    }

    #[test]
    fn test_different_passphrase_cannot_decrypt() {
        let salt = generate_salt();
        let vault1 = Vault::unlock("passphrase1", &salt).unwrap();
        let vault2 = Vault::unlock("passphrase2", &salt).unwrap();

        let plaintext = b"Secret";
        let encrypted = vault1.encrypt(plaintext, b"").unwrap();

        let result = vault2.decrypt(&encrypted, b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_encrypted_data_format() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Test";

        let encrypted = vault.encrypt(plaintext, b"").unwrap();

        // Should have nonce (12 bytes) + ciphertext (plaintext + 16 byte tag)
        assert!(encrypted.len() >= NONCE_LENGTH + plaintext.len() + 16);
    }

    #[test]
    fn test_empty_plaintext() {
        let (vault, _) = create_test_vault();
        let plaintext = b"";
        let aad = b"context";

        let encrypted = vault.encrypt(plaintext, aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_large_plaintext() {
        let (vault, _) = create_test_vault();
        let plaintext = vec![0xABu8; 1024 * 1024]; // 1 MB
        let aad = b"";

        let encrypted = vault.encrypt(&plaintext, aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
