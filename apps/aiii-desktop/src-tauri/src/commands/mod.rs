//! Tauri IPC commands
//!
//! This module contains all Tauri commands that can be invoked from the frontend.
//! Commands are organized by domain: vault, spaces, memories, MCP server, sync, and settings.

mod mcp;
mod memories;
mod settings;
mod spaces;
mod sync;
mod vault;

pub use mcp::*;
pub use memories::*;
pub use settings::*;
pub use spaces::*;
pub use sync::*;
pub use vault::*;
