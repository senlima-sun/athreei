//! Tauri IPC commands
//!
//! This module contains all Tauri commands that can be invoked from the frontend.
//! Commands are organized by domain: vault, spaces, memories, MCP server, sync, settings, backup, and trace.

mod backup;
mod mcp;
mod memories;
mod settings;
mod spaces;
mod sync;
mod trace;
mod vault;

pub use backup::*;
pub use mcp::*;
pub use memories::*;
pub use settings::*;
pub use spaces::*;
pub use sync::*;
pub use trace::*;
pub use vault::*;
