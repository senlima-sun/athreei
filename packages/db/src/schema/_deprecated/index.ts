/**
 * Deprecated Schema Exports
 *
 * These schemas are deprecated but kept for backward compatibility.
 * The database tables are preserved - only the exports were removed from the main schema.
 *
 * Note: PostgreSQL and SQLite schemas have the same export names.
 * Import the appropriate one based on your database type.
 */

export * as pgOAuth from "./pg-oauth"
export * as sqliteOAuth from "./sqlite-oauth"
