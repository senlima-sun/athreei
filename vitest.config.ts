import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Exclude packages with their own vitest configs - they should be run separately
      "packages/dashboard/**/*.test.{ts,tsx}",
      // Exclude tests that use bun:sqlite - run with 'bun test' instead
      "packages/mcp-server/src/db/**/*.test.ts",
      "packages/mcp-server/src/server.test.ts",
      "packages/gateway/src/__tests__/trace-collector.test.ts",
      "packages/gateway/src/__tests__/trace-sync.test.ts",
    ],
    environmentMatchGlobs: [
      // Use jsdom for extension tests (browser environment)
      ["packages/extension/**/*.test.ts", "jsdom"],
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@athreei/shared": resolve(__dirname, "./packages/shared/src"),
    },
  },
})
