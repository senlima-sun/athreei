//! Tauri IPC commands
//!
//! This module contains all Tauri commands that can be invoked from the frontend.
//! Commands are organized by domain: vault, spaces, memories, and MCP server.

mod mcp;
mod memories;
mod spaces;
mod vault;

pub use mcp::*;
pub use memories::*;
pub use spaces::*;
pub use vault::*;
