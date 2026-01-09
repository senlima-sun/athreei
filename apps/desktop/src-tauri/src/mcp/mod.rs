//! MCP (Model Context Protocol) server implementation
//!
//! This module provides the MCP server for aiii-memory, allowing AI apps
//! like Claude Desktop to interact with the local memory store.
//!
//! ## Architecture
//!
//! - `handler`: rmcp ServerHandler implementation
//! - `tools`: Tool implementations (search, get, create, update, list)
//! - `resources`: aiii:// URI resource handlers
//! - `state`: Tauri state management for server lifecycle
//! - `transport`: Transport layer (stdio for Claude Desktop)

mod handler;
pub mod resources;
mod server;
pub mod state;
mod tools;
mod transport;

pub use handler::AiiiHandler;
pub use server::{AiiiMcpServer, ServerInfo};
pub use state::{McpServerState, McpStatus};
pub use tools::McpTools;
pub use transport::run_stdio_server;
