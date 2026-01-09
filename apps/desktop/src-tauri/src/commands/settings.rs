//! Settings-related Tauri commands
//!
//! Provides IPC commands for application settings management.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::encryption::VaultState;
use crate::state::DatabaseState;

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    /// Auto-lock timeout in seconds (0 = disabled)
    pub auto_lock_timeout: u64,
    /// Launch at system startup
    pub launch_at_startup: bool,
    /// Data retention period in days (0 = keep forever)
    pub data_retention_days: u64,
    /// Keyboard shortcuts
    pub shortcuts: KeyboardShortcuts,
}

/// Keyboard shortcut configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardShortcuts {
    /// Global search shortcut
    pub global_search: String,
    /// Quick capture shortcut
    pub quick_capture: String,
    /// Lock vault shortcut
    pub lock_vault: String,
}

impl Default for KeyboardShortcuts {
    fn default() -> Self {
        Self {
            global_search: "CommandOrControl+K".to_string(),
            quick_capture: "CommandOrControl+Shift+N".to_string(),
            lock_vault: "CommandOrControl+L".to_string(),
        }
    }
}

/// State for managing settings
pub struct SettingsState {
    settings: std::sync::RwLock<AppSettings>,
    settings_path: std::path::PathBuf,
}

impl SettingsState {
    pub fn new(app_dir: &std::path::Path) -> Self {
        let settings_path = app_dir.join("settings.json");

        // Try to load existing settings
        let settings = if settings_path.exists() {
            std::fs::read_to_string(&settings_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            AppSettings::default()
        };

        Self {
            settings: std::sync::RwLock::new(settings),
            settings_path,
        }
    }

    pub fn get(&self) -> AppSettings {
        self.settings.read().unwrap().clone()
    }

    pub fn set(&self, settings: AppSettings) -> Result<(), String> {
        // Save to disk
        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {e}"))?;

        std::fs::write(&self.settings_path, json)
            .map_err(|e| format!("Failed to write settings: {e}"))?;

        // Update in memory
        *self.settings.write().unwrap() = settings;

        Ok(())
    }

    pub fn update<F>(&self, f: F) -> Result<(), String>
    where
        F: FnOnce(&mut AppSettings),
    {
        let mut settings = self.get();
        f(&mut settings);
        self.set(settings)
    }
}

/// Get current database path
#[tauri::command]
pub async fn settings_get_database_path(db: State<'_, Arc<DatabaseState>>) -> Result<String, String> {
    Ok(db.path.to_string_lossy().to_string())
}

/// Get current application settings
#[tauri::command]
pub async fn settings_get(settings: State<'_, SettingsState>) -> Result<AppSettings, String> {
    Ok(settings.get())
}

/// Update application settings
#[tauri::command]
pub async fn settings_set(
    new_settings: AppSettings,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    settings.set(new_settings)
}

/// Set auto-lock timeout
#[tauri::command]
pub async fn settings_set_auto_lock(
    timeout_seconds: u64,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    settings.update(|s| s.auto_lock_timeout = timeout_seconds)
}

/// Get auto-lock timeout
#[tauri::command]
pub async fn settings_get_auto_lock(settings: State<'_, SettingsState>) -> Result<u64, String> {
    Ok(settings.get().auto_lock_timeout)
}

/// Set launch at startup
#[tauri::command]
pub async fn settings_set_launch_at_startup(
    enabled: bool,
    settings: State<'_, SettingsState>,
    app: AppHandle,
) -> Result<(), String> {
    // Update settings
    settings.update(|s| s.launch_at_startup = enabled)?;

    // Configure autostart (platform-specific)
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let app_path = app
            .path()
            .resource_dir()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .ok_or("Failed to get app path")?;

        if enabled {
            // Add login item on macOS
            let script = format!(
                r#"osascript -e 'tell application "System Events" to make login item at end with properties {{path:"{}", hidden:false}}'"#,
                app_path.to_string_lossy()
            );
            let _ = Command::new("sh").arg("-c").arg(&script).output();
        } else {
            // Remove login item on macOS
            let script = format!(
                r#"osascript -e 'tell application "System Events" to delete login item "aiii Desktop"'"#
            );
            let _ = Command::new("sh").arg("-c").arg(&script).output();
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Windows registry-based autostart would go here
        // For now, just save the setting
    }

    #[cfg(target_os = "linux")]
    {
        // Linux .desktop file autostart would go here
        // For now, just save the setting
    }

    Ok(())
}

/// Get launch at startup setting
#[tauri::command]
pub async fn settings_get_launch_at_startup(
    settings: State<'_, SettingsState>,
) -> Result<bool, String> {
    Ok(settings.get().launch_at_startup)
}

/// Set keyboard shortcuts
#[tauri::command]
pub async fn settings_set_shortcuts(
    shortcuts: KeyboardShortcuts,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    settings.update(|s| s.shortcuts = shortcuts)
}

/// Get keyboard shortcuts
#[tauri::command]
pub async fn settings_get_shortcuts(
    settings: State<'_, SettingsState>,
) -> Result<KeyboardShortcuts, String> {
    Ok(settings.get().shortcuts)
}

/// Set data retention period
#[tauri::command]
pub async fn settings_set_data_retention(
    days: u64,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    settings.update(|s| s.data_retention_days = days)
}

/// Get data retention period
#[tauri::command]
pub async fn settings_get_data_retention(
    settings: State<'_, SettingsState>,
) -> Result<u64, String> {
    Ok(settings.get().data_retention_days)
}

/// Clean up old memories based on retention period
#[tauri::command]
pub async fn settings_cleanup_old_memories(
    db: State<'_, Arc<DatabaseState>>,
    settings: State<'_, SettingsState>,
) -> Result<usize, String> {
    let retention_days = settings.get().data_retention_days;

    if retention_days == 0 {
        return Ok(0); // Retention disabled
    }

    let cutoff_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        - (retention_days as i64 * 24 * 60 * 60);

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Delete memories older than cutoff
    // Note: This would need a new repository method
    // For now, return 0 as a placeholder
    Ok(0)
}

/// Get app version and info
#[tauri::command]
pub async fn settings_get_app_info() -> Result<AppInfo, String> {
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
        authors: env!("CARGO_PKG_AUTHORS").to_string(),
    })
}

/// Application info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
    pub authors: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_keyboard_shortcuts_default() {
        let shortcuts = KeyboardShortcuts::default();

        assert_eq!(shortcuts.global_search, "CommandOrControl+K");
        assert_eq!(shortcuts.quick_capture, "CommandOrControl+Shift+N");
        assert_eq!(shortcuts.lock_vault, "CommandOrControl+L");
    }

    #[test]
    fn test_app_settings_default() {
        let settings = AppSettings::default();

        assert_eq!(settings.auto_lock_timeout, 0);
        assert!(!settings.launch_at_startup);
        assert_eq!(settings.data_retention_days, 0);
    }

    #[test]
    fn test_settings_state_new() {
        let dir = tempdir().unwrap();
        let state = SettingsState::new(dir.path());

        let settings = state.get();
        assert_eq!(settings.auto_lock_timeout, 0);
        assert!(!settings.launch_at_startup);
    }

    #[test]
    fn test_settings_state_set() {
        let dir = tempdir().unwrap();
        let state = SettingsState::new(dir.path());

        let mut settings = state.get();
        settings.auto_lock_timeout = 300;
        settings.launch_at_startup = true;

        state.set(settings).unwrap();

        let updated = state.get();
        assert_eq!(updated.auto_lock_timeout, 300);
        assert!(updated.launch_at_startup);
    }

    #[test]
    fn test_settings_state_update() {
        let dir = tempdir().unwrap();
        let state = SettingsState::new(dir.path());

        state.update(|s| {
            s.auto_lock_timeout = 600;
            s.data_retention_days = 90;
        }).unwrap();

        let settings = state.get();
        assert_eq!(settings.auto_lock_timeout, 600);
        assert_eq!(settings.data_retention_days, 90);
    }

    #[test]
    fn test_settings_persistence() {
        let dir = tempdir().unwrap();

        // Set some settings
        {
            let state = SettingsState::new(dir.path());
            let mut settings = state.get();
            settings.auto_lock_timeout = 1800;
            state.set(settings).unwrap();
        }

        // Create new state and verify persistence
        {
            let state = SettingsState::new(dir.path());
            let settings = state.get();
            assert_eq!(settings.auto_lock_timeout, 1800);
        }
    }

    #[test]
    fn test_settings_file_created() {
        let dir = tempdir().unwrap();
        let settings_path = dir.path().join("settings.json");

        assert!(!settings_path.exists());

        let state = SettingsState::new(dir.path());
        state.set(AppSettings::default()).unwrap();

        assert!(settings_path.exists());
    }

    #[test]
    fn test_keyboard_shortcuts_update() {
        let dir = tempdir().unwrap();
        let state = SettingsState::new(dir.path());

        state.update(|s| {
            s.shortcuts.global_search = "CommandOrControl+P".to_string();
        }).unwrap();

        let settings = state.get();
        assert_eq!(settings.shortcuts.global_search, "CommandOrControl+P");
    }
}
