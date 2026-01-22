import { defineConfig } from "vitest/config"
import { resolve } from "path"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/*.test.{ts,tsx}", "apps/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "packages/dashboard/**/*.test.{ts,tsx}",
      "packages/mcp-server/src/db/**/*.test.ts",
      "packages/mcp-server/src/server.test.ts",
      "packages/gateway/src/__tests__/trace-collector.test.ts",
      "packages/gateway/src/__tests__/trace-sync.test.ts",
      "apps/desktop/reference/**/*.test.ts",
      "**/__tests__/integration.test.ts",
    ],
    environmentMatchGlobs: [
      // Use jsdom for extension tests (browser environment)
      ["packages/extension/**/*.test.ts", "jsdom"],
      // Use jsdom for React component tests
      ["apps/platform/**/*.test.tsx", "jsdom"],
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@athreei/shared": resolve(__dirname, "./packages/shared/src"),
      "@athreei/gateway-core": resolve(__dirname, "./packages/gateway-core/src"),
      // Platform app uses @/* path alias (Next.js convention)
      "@/constants": resolve(__dirname, "./apps/platform/src/constants"),
      "@/lib": resolve(__dirname, "./apps/platform/src/lib"),
      "@/components": resolve(__dirname, "./apps/platform/src/components"),
      "@/hooks": resolve(__dirname, "./apps/platform/src/hooks"),
    },
  },
})
