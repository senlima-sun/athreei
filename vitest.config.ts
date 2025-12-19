import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
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
      "@athreei/shared": "./packages/shared/src",
    },
  },
})
