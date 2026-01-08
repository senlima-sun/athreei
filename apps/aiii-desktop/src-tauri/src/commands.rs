//! Tauri commands
//!
//! This module contains all the Tauri commands that can be invoked from the frontend.

/// Simple greet command for testing
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to aiii Desktop.", name)
}
