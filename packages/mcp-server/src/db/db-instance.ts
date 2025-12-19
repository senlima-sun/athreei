/**
 * Database instance initialization
 *
 * This file contains only the database instance to avoid circular dependencies.
 */

import { Database } from "bun:sqlite"
import { existsSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// Database file location
const DATA_DIR = join(homedir(), ".athreei")
const DB_PATH = join(DATA_DIR, "data.db")

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize database
export const db = new Database(DB_PATH, { create: true })

// Enable WAL mode for better concurrency
db.exec("PRAGMA journal_mode = WAL")

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON")
