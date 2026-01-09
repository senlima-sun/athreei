//! Encryption module for aiii Desktop
//!
//! Provides secure encryption/decryption for memory content using:
//! - AES-256-GCM for authenticated encryption
//! - Argon2id for key derivation
//!
//! ## Usage
//!
//! ```rust,ignore
//! use aiii_desktop_lib::encryption::{VaultState, VaultError};
//!
//! // Create a new vault state
//! let state = VaultState::new();
//!
//! // Unlock with passphrase (generates salt on first unlock)
//! let salt = state.unlock("my-passphrase")?;
//!
//! // Encrypt data with additional authenticated data
//! let aad = format!("memory:{}|space:{}", memory_id, space_id);
//! let encrypted = state.encrypt(plaintext, aad.as_bytes())?;
//!
//! // Decrypt data
//! let decrypted = state.decrypt(&encrypted, aad.as_bytes())?;
//!
//! // Lock when done
//! state.lock();
//! ```
//!
//! ## Security Properties
//!
//! - **Confidentiality**: AES-256-GCM provides 256-bit security
//! - **Integrity**: GCM mode provides authenticated encryption
//! - **Key Derivation**: Argon2id with 64MB memory cost resists GPU attacks
//! - **Nonce Handling**: Random 96-bit nonces per encryption
//! - **AAD Binding**: Ciphertext is bound to context (memory_id, space_id)

mod error;
mod key;
mod state;
mod vault;

pub use error::VaultError;
pub use key::{
    derive_key, generate_salt, ARGON2_ITERATIONS, ARGON2_MEMORY_KB, ARGON2_PARALLELISM, KEY_LENGTH,
    SALT_LENGTH,
};
pub use state::VaultState;
pub use vault::{Vault, NONCE_LENGTH};
