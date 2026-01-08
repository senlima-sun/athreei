//! Storage module for SQLite database operations
//!
//! This module provides database access for spaces and memories with FTS5 full-text search.

mod db;
mod models;
mod repository;

pub use db::Database;
pub use models::{Memory, MemoryWithTags, Space, Tag};
