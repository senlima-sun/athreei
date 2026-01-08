//! aiii Desktop library
//!
//! This module contains the core functionality for the aiii Desktop application.

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

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

            // Setup system tray
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window to tray instead of closing on desktop
            if let WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(not(target_os = "ios"))]
                {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
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
