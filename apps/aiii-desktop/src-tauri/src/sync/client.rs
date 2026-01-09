//! Sync client for cloud synchronization
//!
//! HTTP client for communicating with the athreei sync server.

use super::types::{SyncChange, SyncConfig, SyncRequest, SyncResponse};
use std::time::Duration;
use thiserror::Error;

/// Sync client errors
#[derive(Debug, Error)]
pub enum SyncClientError {
    /// Network request failed
    #[error("Network error: {0}")]
    Network(String),

    /// Server returned an error
    #[error("Server error: {0}")]
    Server(String),

    /// Authentication failed
    #[error("Authentication failed: {0}")]
    Auth(String),

    /// Invalid response from server
    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    /// Sync not configured
    #[error("Sync not configured")]
    NotConfigured,

    /// Serialization error
    #[error("Serialization error: {0}")]
    Serialization(String),
}

/// HTTP client for sync operations
pub struct SyncClient {
    config: SyncConfig,
    client: reqwest::Client,
}

impl SyncClient {
    /// Create a new sync client with the given configuration
    pub fn new(config: SyncConfig) -> Result<Self, SyncClientError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| SyncClientError::Network(e.to_string()))?;

        Ok(Self { config, client })
    }

    /// Check if the client is properly configured for sync
    pub fn is_configured(&self) -> bool {
        self.config.auth_token.is_some()
    }

    /// Get the device ID
    pub fn device_id(&self) -> &str {
        &self.config.device_id
    }

    /// Update the configuration
    pub fn set_config(&mut self, config: SyncConfig) {
        self.config = config;
    }

    /// Send sync request to the server
    pub async fn sync(
        &self,
        changes: Vec<SyncChange>,
        cursor: Option<String>,
    ) -> Result<SyncResponse, SyncClientError> {
        if !self.is_configured() {
            return Err(SyncClientError::NotConfigured);
        }

        let request = SyncRequest::new(self.config.device_id.clone(), changes, cursor);

        let auth_token = self
            .config
            .auth_token
            .as_ref()
            .ok_or(SyncClientError::NotConfigured)?;

        let url = format!("{}/api/v1/sync", self.config.server_url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| SyncClientError::Network(e.to_string()))?;

        let status = response.status();

        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(SyncClientError::Auth("Invalid or expired token".to_string()));
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(SyncClientError::Server(format!(
                "{}: {}",
                status, error_text
            )));
        }

        let sync_response: SyncResponse = response
            .json()
            .await
            .map_err(|e| SyncClientError::InvalidResponse(e.to_string()))?;

        if !sync_response.success {
            return Err(SyncClientError::Server(
                sync_response
                    .error
                    .unwrap_or_else(|| "Unknown server error".to_string()),
            ));
        }

        Ok(sync_response)
    }

    /// Verify authentication with the sync server
    pub async fn verify_auth(&self) -> Result<bool, SyncClientError> {
        if !self.is_configured() {
            return Ok(false);
        }

        let auth_token = self
            .config
            .auth_token
            .as_ref()
            .ok_or(SyncClientError::NotConfigured)?;

        let url = format!("{}/api/v1/auth/verify", self.config.server_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send()
            .await
            .map_err(|e| SyncClientError::Network(e.to_string()))?;

        Ok(response.status().is_success())
    }

    /// Get current sync server URL
    pub fn server_url(&self) -> &str {
        &self.config.server_url
    }

    /// Check if auto-sync is enabled
    pub fn auto_sync_enabled(&self) -> bool {
        self.config.auto_sync
    }

    /// Get auto-sync interval
    pub fn sync_interval(&self) -> u64 {
        self.config.sync_interval
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_not_configured() {
        let config = SyncConfig::default();
        let client = SyncClient::new(config).unwrap();

        assert!(!client.is_configured());
    }

    #[test]
    fn test_client_configured() {
        let mut config = SyncConfig::default();
        config.auth_token = Some("test-token".to_string());
        let client = SyncClient::new(config).unwrap();

        assert!(client.is_configured());
    }

    #[test]
    fn test_device_id() {
        let config = SyncConfig::default();
        let device_id = config.device_id.clone();
        let client = SyncClient::new(config).unwrap();

        assert_eq!(client.device_id(), device_id);
    }
}
