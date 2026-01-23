import { defineConfig, defineProject } from "vitest/config"
import { resolve } from "path"
import react from "@vitejs/plugin-react"

const sharedExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "packages/dashboard/**/*.test.{ts,tsx}",
  "packages/mcp-server/src/db/**/*.test.ts",
  "packages/mcp-server/src/server.test.ts",
  "packages/gateway/src/__tests__/trace-collector.test.ts",
  "packages/gateway/src/__tests__/trace-sync.test.ts",
  "apps/desktop/reference/**/*.test.ts",
  "**/__tests__/integration.test.ts",
]

const sharedAlias = {
  "@athreei/shared": resolve(__dirname, "./packages/shared/src"),
  "@/constants": resolve(__dirname, "./apps/platform/src/constants"),
  "@/lib": resolve(__dirname, "./apps/platform/src/lib"),
  "@/components": resolve(__dirname, "./apps/platform/src/components"),
  "@/hooks": resolve(__dirname, "./apps/platform/src/hooks"),
}

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
    },
    projects: [
      defineProject({
        plugins: [react()],
        test: {
          name: "node",
          environment: "node",
          include: ["packages/**/*.test.ts", "apps/api/**/*.test.ts"],
          exclude: [
            ...sharedExclude,
            "packages/extension/**/*.test.ts",
            "apps/platform/**/*.test.tsx",
          ],
        },
        resolve: { alias: sharedAlias },
      }),
      defineProject({
        plugins: [react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: [
            "packages/extension/**/*.test.ts",
            "apps/platform/**/*.test.tsx",
          ],
          exclude: sharedExclude,
        },
        resolve: { alias: sharedAlias },
      }),
    ],
  },
  resolve: {
    alias: {
      "@athreei/shared": resolve(__dirname, "./packages/shared/src"),
      "@athreei/gateway-core": resolve(__dirname, "./packages/gateway-core/src"),
      "@/constants": resolve(__dirname, "./apps/platform/src/constants"),
      "@/lib": resolve(__dirname, "./apps/platform/src/lib"),
      "@/components": resolve(__dirname, "./apps/platform/src/components"),
      "@/hooks": resolve(__dirname, "./apps/platform/src/hooks"),
    },
  },
})
