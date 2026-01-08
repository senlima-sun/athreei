//! MCP (Model Context Protocol) server implementation
//!
//! This module provides the MCP server for aiii-memory, allowing AI apps
//! like Claude Desktop to interact with the local memory store.
//!
//! ## Architecture
//!
//! - `server`: Core MCP server struct
//! - `state`: Tauri state management for server lifecycle
//! - `transport`: Transport layer management (stdio for now, HTTP later)
//! - `resources`: aiii:// URI resource handlers (pending full implementation)

mod server;
pub mod state;
mod transport;

pub use server::{AiiiMcpServer, ServerInfo};
pub use state::{McpServerState, McpStatus};
pub use transport::run_stdio_server;

// Resources module exists but isn't fully integrated yet
// pub mod resources;
