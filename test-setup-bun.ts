/**
 * Test setup for Bun's native test runner
 *
 * This file provides compatibility shims for tests that need to run
 * under both Vitest and Bun's test runner.
 *
 * NOTE: Most tests should use "vitest run" (the default test command).
 * Bun's test runner is only for tests that specifically need bun:sqlite
 * or other Bun-specific features.
 */

// No-op for now - we exclude vitest-specific tests in bunfig.toml
// If you need to add compatibility shims, add them here
