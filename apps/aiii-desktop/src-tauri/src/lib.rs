//! aiii Desktop library
//!
//! This module contains the core functionality for the aiii Desktop application.

use std::sync::Arc;
use tauri::Manager;

mod commands;
pub mod encryption;
pub mod mcp;
pub mod state;
pub mod storage;

use encryption::VaultState;
use mcp::McpServerState;
use state::DatabaseState;

/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Get app data directory
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize database state (wrapped in Arc for sharing)
            let db_state = Arc::new(
                DatabaseState::new(&app_dir).expect("Failed to initialize database state"),
            );

            // Initialize vault state (wrapped in Arc for sharing)
            let vault_state = Arc::new(VaultState::new());

            // Initialize MCP server state with shared references
            let mcp_state = McpServerState::new(db_state.clone(), vault_state.clone());

            // Manage states
            // Note: We manage the Arc'd versions for direct access too
            app.manage(db_state);
            app.manage(vault_state);
            app.manage(mcp_state);

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            commands::vault_unlock,
            commands::vault_lock,
            commands::vault_status,
            commands::vault_setup,
            commands::vault_is_setup,
            // Space commands
            commands::list_spaces,
            commands::get_space,
            commands::create_space,
            commands::update_space,
            commands::delete_space,
            commands::count_space_memories,
            // Memory commands
            commands::list_memories,
            commands::get_memory,
            commands::create_memory,
            commands::search_memories,
            commands::delete_memory,
            commands::update_memory_tags,
            commands::list_tags,
            commands::count_memories,
            // MCP server commands
            commands::mcp_start,
            commands::mcp_stop,
            commands::mcp_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
