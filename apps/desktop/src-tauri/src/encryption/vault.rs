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
            .encrypt(
                nonce,
                aes_gcm::aead::Payload {
                    msg: plaintext,
                    aad,
                },
            )
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
            .decrypt(
                nonce,
                aes_gcm::aead::Payload {
                    msg: ciphertext,
                    aad,
                },
            )
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


    #[test]
    fn test_encrypt_various_lengths() {
        let (vault, _) = create_test_vault();
        let aad = b"context";

        // Test various plaintext lengths
        let lengths = [1, 15, 16, 17, 31, 32, 33, 100, 256, 512, 1024];

        for len in lengths {
            let plaintext: Vec<u8> = (0..len).map(|i| (i % 256) as u8).collect();
            let encrypted = vault.encrypt(&plaintext, aad).unwrap();
            let decrypted = vault.decrypt(&encrypted, aad).unwrap();

            assert_eq!(decrypted, plaintext, "Failed for length {}", len);
        }
    }

    #[test]
    fn test_different_aad_values() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret data";

        let aad1 = b"memory:123|space:456";
        let aad2 = b"memory:789|space:abc";

        // Encrypt with aad1
        let encrypted1 = vault.encrypt(plaintext, aad1).unwrap();

        // Decrypt with aad1 should work
        let decrypted = vault.decrypt(&encrypted1, aad1).unwrap();
        assert_eq!(decrypted, plaintext);

        // Decrypt with aad2 should fail
        let result = vault.decrypt(&encrypted1, aad2);
        assert!(result.is_err());
    }

    #[test]
    fn test_binary_data_encryption() {
        let (vault, _) = create_test_vault();

        // Binary data with various byte values
        let plaintext: Vec<u8> = (0..256).map(|i| i as u8).collect();
        let aad = b"binary";

        let encrypted = vault.encrypt(&plaintext, aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_unicode_in_plaintext() {
        let (vault, _) = create_test_vault();

        let plaintext = "Hello, 世界! 🌍 مرحبا".as_bytes();
        let aad = b"";

        let encrypted = vault.encrypt(plaintext, aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
        assert_eq!(String::from_utf8(decrypted).unwrap(), "Hello, 世界! 🌍 مرحبا");
    }

    #[test]
    fn test_encrypted_length_overhead() {
        let (vault, _) = create_test_vault();

        let plaintext = b"Test data";
        let encrypted = vault.encrypt(plaintext, b"").unwrap();

        // Encrypted length = nonce (12) + plaintext + tag (16)
        assert_eq!(encrypted.len(), NONCE_LENGTH + plaintext.len() + 16);
    }

    #[test]
    fn test_multiple_encryptions_unique_nonces() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Same plaintext";
        let aad = b"";

        // Encrypt many times
        let mut nonces = std::collections::HashSet::new();
        for _ in 0..100 {
            let encrypted = vault.encrypt(plaintext, aad).unwrap();
            let nonce: [u8; NONCE_LENGTH] = encrypted[..NONCE_LENGTH].try_into().unwrap();
            nonces.insert(nonce);
        }

        // All nonces should be unique
        assert_eq!(nonces.len(), 100);
    }

    #[test]
    fn test_tamper_nonce_fails() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret";
        let aad = b"";

        let mut encrypted = vault.encrypt(plaintext, aad).unwrap();

        // Tamper with the nonce (first 12 bytes)
        encrypted[0] ^= 0xFF;

        let result = vault.decrypt(&encrypted, aad);
        assert!(result.is_err());
    }

    #[test]
    fn test_tamper_middle_of_ciphertext() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret data that is long enough";
        let aad = b"";

        let mut encrypted = vault.encrypt(plaintext, aad).unwrap();

        // Tamper with middle of ciphertext
        let middle = encrypted.len() / 2;
        encrypted[middle] ^= 0xFF;

        let result = vault.decrypt(&encrypted, aad);
        assert!(result.is_err());
    }

    #[test]
    fn test_truncated_ciphertext_fails() {
        let (vault, _) = create_test_vault();
        let plaintext = b"Secret data";
        let aad = b"";

        let encrypted = vault.encrypt(plaintext, aad).unwrap();

        // Truncate the ciphertext (remove last byte of tag)
        let truncated = &encrypted[..encrypted.len() - 1];

        let result = vault.decrypt(truncated, aad);
        assert!(result.is_err());
    }

    #[test]
    fn test_minimum_valid_encrypted_data() {
        let (vault, _) = create_test_vault();

        // Minimum encrypted data is nonce (12) + tag (16) for empty plaintext
        // Data with exactly 12 bytes should fail (no tag)
        let result = vault.decrypt(&[0u8; 12], b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_random_data_fails() {
        let (vault, _) = create_test_vault();

        // Random 50 bytes of data
        let random_data: Vec<u8> = (0..50).map(|i| (i * 7 % 256) as u8).collect();

        let result = vault.decrypt(&random_data, b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_same_salt_same_passphrase_produces_same_vault() {
        let salt = generate_salt();

        // Create two vaults with same salt and passphrase
        let vault1 = Vault::unlock("same-passphrase", &salt).unwrap();
        let vault2 = Vault::unlock("same-passphrase", &salt).unwrap();

        let plaintext = b"Test data";
        let aad = b"context";

        // Encrypt with vault1
        let encrypted = vault1.encrypt(plaintext, aad).unwrap();

        // Decrypt with vault2
        let decrypted = vault2.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_salt_same_passphrase_fails() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();

        // Ensure salts are different
        assert_ne!(salt1, salt2);

        let vault1 = Vault::unlock("same-passphrase", &salt1).unwrap();
        let vault2 = Vault::unlock("same-passphrase", &salt2).unwrap();

        let plaintext = b"Test data";
        let encrypted = vault1.encrypt(plaintext, b"").unwrap();

        // Should fail to decrypt with vault2 (different salt = different key)
        let result = vault2.decrypt(&encrypted, b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_special_characters_in_passphrase() {
        let salt = generate_salt();
        let passphrase = "p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?";

        let vault = Vault::unlock(passphrase, &salt).unwrap();

        let plaintext = b"Secret";
        let encrypted = vault.encrypt(plaintext, b"").unwrap();
        let decrypted = vault.decrypt(&encrypted, b"").unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_unicode_passphrase() {
        let salt = generate_salt();
        let passphrase = "密码🔐пароль";

        let vault = Vault::unlock(passphrase, &salt).unwrap();

        let plaintext = b"Secret";
        let encrypted = vault.encrypt(plaintext, b"").unwrap();
        let decrypted = vault.decrypt(&encrypted, b"").unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_empty_passphrase() {
        let salt = generate_salt();
        let passphrase = "";

        // Empty passphrase should still work (though not recommended)
        let vault = Vault::unlock(passphrase, &salt).unwrap();

        let plaintext = b"Secret";
        let encrypted = vault.encrypt(plaintext, b"").unwrap();
        let decrypted = vault.decrypt(&encrypted, b"").unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_long_passphrase() {
        let salt = generate_salt();
        let passphrase = "a".repeat(1000);

        let vault = Vault::unlock(&passphrase, &salt).unwrap();

        let plaintext = b"Secret";
        let encrypted = vault.encrypt(plaintext, b"").unwrap();
        let decrypted = vault.decrypt(&encrypted, b"").unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_large_aad() {
        let (vault, _) = create_test_vault();

        let plaintext = b"Secret";
        let large_aad = vec![0xFFu8; 10000];

        let encrypted = vault.encrypt(plaintext, &large_aad).unwrap();
        let decrypted = vault.decrypt(&encrypted, &large_aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_aad_verification_is_exact() {
        let (vault, _) = create_test_vault();

        let plaintext = b"Secret";
        let aad = b"exact_match";

        let encrypted = vault.encrypt(plaintext, aad).unwrap();

        // Slightly modified AAD should fail
        let modified_aad = b"exact_Match"; // Capital M
        let result = vault.decrypt(&encrypted, modified_aad);
        assert!(result.is_err());
    }
}
