/**
 * Schema exports
 *
 * This file re-exports all schema definitions for the athreei platform.
 * PostgreSQL is the default schema. SQLite is available via ./sqlite subpath.
 */

// Default: PostgreSQL schema
export * from "./pg"

// Re-export dialect-specific schemas as namespaces for explicit imports
export * as pg from "./pg"
export * as sqlite from "./sqlite"
